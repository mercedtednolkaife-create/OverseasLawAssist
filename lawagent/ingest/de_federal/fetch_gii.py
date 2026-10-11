"""德国联邦法律法规下载模块 (gesetze-im-internet.de)
对齐技术方案第 1.1 节与第 4.3 节：
- 礼貌抓取：带合规 User-Agent，限速，超时重试
- 缓存到 raw 目录，一次性下载固定快照目录，实现离线可复现开发
"""

import os
import io
import time
import httpx
from typing import Dict, List, Optional
from tenacity import retry, stop_after_attempt, wait_exponential


USER_AGENT = "OverseasLawAssist-Agent/1.0 (+https://github.com/lu-yucheng/OverseasLawAssist; legal-research)"


class GIIFetcher:
    BASE_URL = "https://www.gesetze-im-internet.de"
    TOC_URL = "https://www.gesetze-im-internet.de/gii-toc.xml"

    def __init__(self, raw_dir: str = "data/raw", timeout: float = 30.0):
        self.raw_dir = raw_dir
        self.timeout = timeout
        os.makedirs(self.raw_dir, exist_ok=True)

    def _get_client(self) -> httpx.Client:
        return httpx.Client(
            headers={"User-Agent": USER_AGENT},
            timeout=self.timeout,
            follow_redirects=True,
        )

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def fetch_toc(self) -> bytes:
        """获取官方目录 XML"""
        toc_cache = os.path.join(self.raw_dir, "gii-toc.xml")
        if os.path.exists(toc_cache) and os.path.getsize(toc_cache) > 0:
            with open(toc_cache, "rb") as f:
                return f.read()

        with self._get_client() as client:
            resp = client.get(self.TOC_URL)
            resp.raise_for_status()
            content = resp.content
            with open(toc_cache, "wb") as f:
                f.write(content)
            return content

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def fetch_law_zip(self, slug: str) -> str:
        """下载单个法律的 xml.zip 并保存到 raw 目录，返回保存的文件路径"""
        clean_slug = slug.lower().strip()
        zip_path = os.path.join(self.raw_dir, f"{clean_slug}.zip")
        if os.path.exists(zip_path) and os.path.getsize(zip_path) > 0:
            return zip_path

        url = f"{self.BASE_URL}/{clean_slug}/xml.zip"
        with self._get_client() as client:
            resp = client.get(url)
            resp.raise_for_status()
            with open(zip_path, "wb") as f:
                f.write(resp.content)
            # 礼貌限速
            time.sleep(1.0)
            return zip_path

    def fetch_laws(self, slugs: List[str]) -> Dict[str, str]:
        """批量下载选定法律"""
        out = {}
        for s in slugs:
            path = self.fetch_law_zip(s)
            out[s.upper()] = path
        return out
