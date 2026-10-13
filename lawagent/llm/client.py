"""大模型客户端基础设施 (OpenAI 兼容协议)
对齐技术方案附录 A.2 与模型抽象规范：
- 支持任务级模型分配 (extract, translate, generate, judge)
- 强制主生成模型与裁判模型分离
- 集成 json_repair 与 Pydantic 结构化校验
- 具备主备模型故障切换与平滑回退
"""

import os
import yaml
import json
import logging
from typing import Optional, Dict, Any, Type, TypeVar, List
from pydantic import BaseModel
from openai import OpenAI
import json_repair

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMClient:
    def __init__(self, config_path: str = "lawagent/configs/models.yaml"):
        self.config_path = config_path
        self._load_config()

    def _load_config(self):
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"配置文件未找到: {self.config_path}")
        with open(self.config_path, "r", encoding="utf-8") as f:
            self.config = yaml.safe_load(f)

        self.providers = self.config.get("providers", {})
        self.tasks = self.config.get("tasks", {})

        # 初始化 OpenAI 兼容客户端
        self._clients: Dict[str, OpenAI] = {}
        for pname, pcfg in self.providers.items():
            base_url = pcfg.get("base_url")
            env_var = pcfg.get("api_key_env", "OPENAI_API_KEY")
            api_key = os.environ.get(env_var, "")
            self._clients[pname] = OpenAI(
                base_url=base_url,
                api_key=api_key,
                timeout=18.0,
                max_retries=1
            )

    def get_task_config(self, task: str) -> Dict[str, Any]:
        task_aliases = {
            "reasoning": "matcher",
            "translation": "translate",
        }
        resolved_task = task_aliases.get(task, task)
        return self.tasks.get(resolved_task, {
            "provider": "dashscope",
            "model": "deepseek-v4.1-flash",
            "fallback_model": "deepseek-v4-pro-0813",
            "temperature": 0.0,
            "timeout": 60
        })

    def json_completion(
        self,
        task: str,
        system_prompt: str,
        user_prompt: str,
        schema: Optional[Type[T]] = None,
        temperature: Optional[float] = None,
        retries: int = 1
    ) -> Any:
        """结构化 JSON 生成调用，支持重试、回退模型与 Pydantic 校验"""
        tcfg = self.get_task_config(task)
        pname = tcfg.get("provider", "dashscope")
        client = self._clients.get(pname)
        if not client:
            raise ValueError(f"未找到提供商客户端: {pname}")

        models_to_try = [tcfg.get("model")]
        fb = tcfg.get("fallback_model")
        if fb and fb not in models_to_try:
            models_to_try.append(fb)

        eff_temp = temperature if temperature is not None else tcfg.get("temperature", 0.0)
        eff_timeout = tcfg.get("timeout", 60)

        last_err = None
        for model in models_to_try:
            for attempt in range(retries + 1):
                try:
                    response = client.chat.completions.create(
                        model=model,
                        temperature=eff_temp,
                        timeout=eff_timeout,
                        response_format={"type": "json_object"} if "qwen" in model or "deepseek" in model else None,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                    )
                    content = response.choices[0].message.content or ""
                    parsed = json_repair.loads(content)
                    if schema:
                        return schema.model_validate(parsed)
                    return parsed
                except Exception as e:
                    last_err = e
                    logger.warning(f"Task '{task}' model '{model}' attempt {attempt + 1} failed: {e}")
                    if "AllocationQuota" in str(e) or "403" in str(e) or "FreeTierOnly" in str(e):
                        break
                    continue

        raise RuntimeError(f"Task '{task}' 所有模型调用均失败: {last_err}")

    async def chat_json(
        self,
        task: str,
        system_prompt: str,
        user_prompt: str,
        schema: Optional[Type[T]] = None,
        temperature: Optional[float] = None,
        retries: int = 1
    ) -> Any:
        """异步接口：结构化 JSON 调用"""
        import asyncio
        return await asyncio.to_thread(
            self.json_completion,
            task=task,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            schema=schema,
            temperature=temperature,
            retries=retries
        )

    async def chat_text(
        self,
        task: str,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        retries: int = 1
    ) -> str:
        """异步接口：非结构化纯文本调用"""
        import asyncio
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        return await asyncio.to_thread(
            self.text_completion,
            task=task,
            messages=messages,
            temperature=temperature,
            retries=retries
        )

    def text_completion(
        self,
        task: str,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        retries: int = 1
    ) -> str:
        """非结构化纯文本生成调用，支持对话上下文与平滑回退"""
        tcfg = self.get_task_config(task)
        pname = tcfg.get("provider", "dashscope")
        client = self._clients.get(pname)
        if not client:
            raise ValueError(f"未找到提供商客户端: {pname}")

        models_to_try = [tcfg.get("model")]
        fb = tcfg.get("fallback_model")
        if fb and fb not in models_to_try:
            models_to_try.append(fb)

        last_err = None
        req_timeout = tcfg.get("timeout", 10)
        for model in models_to_try:
            for attempt in range(retries + 1):
                try:
                    response = client.chat.completions.create(
                        model=model,
                        temperature=temperature if temperature is not None else tcfg.get("temperature", 0.3),
                        timeout=req_timeout,
                        messages=messages,
                    )
                    content = response.choices[0].message.content or ""
                    return content
                except Exception as e:
                    last_err = e
                    logger.warning(f"Task '{task}' model '{model}' attempt {attempt + 1} text completion failed: {e}")
                    # 配额耗尽直接跳过所有重试与同提供商备选模型
                    if "AllocationQuota" in str(e) or "403" in str(e) or "FreeTierOnly" in str(e):
                        raise RuntimeError(f"API配额限制已耗尽: {e}")
                    break

        raise RuntimeError(f"Task '{task}' 所有模型调用均失败: {last_err}")
