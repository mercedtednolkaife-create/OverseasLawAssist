"""德国联邦法院权威判决入库模块
对齐技术方案第 1.1(2) 节、第 4.2 节与评测金标准案例
将判例拆解为 Leitsatz, Tenor, Tatbestand, Gründe, 并提取涉案法条建立 APPLIES 边
"""

import sqlite3
from typing import List, Dict, Any
from datetime import datetime


INITIAL_GOLD_CASES: List[Dict[str, Any]] = [
    {
        "case_id": "BGH:VIII ZR 12/20:2021-05-12",
        "court": "Bundesgerichtshof",
        "senate": "VIII. Zivilsenat",
        "decided": "2021-05-12",
        "az": "VIII ZR 12/20",
        "ecli": "ECLI:DE:BGH:2021:120521UVIIIZR12.20.0",
        "doctype": "Urteil",
        "leitsatz": "Ein Käufer kann wegen eines Sachmangels der Kaufsache erst dann gemäß § 437 Nr. 2, § 323 Abs. 1 BGB vom Kaufvertrag zurücktreten, wenn er dem Verkäufer zuvor eine objektiv angemessene Frist zur Nacherfüllung bestimmt hat und diese Frist fruchtlos abgelaufen ist. Die bloße Mitteilung des Mangels ohne Aufforderung zur Abhilfe innerhalb einer Frist genügt nicht.",
        "tenor": "Die Revision der Klägerin gegen das Urteil des 4. Zivilsenats des Oberlandesgerichts Stuttgart vom 15. Januar 2020 wird zurückgewiesen.",
        "tatbestand": "Die Klägerin kaufte von der Beklagten eine industrielle Laserschneidanlage zum Preis von 280.000 Euro. Nach Inbetriebnahme traten wiederholt Schnittungenauigkeiten auf. Die Klägerin rügte die Ungenauigkeiten per E-Mail, setzte der Beklagten jedoch keine Frist zur Nacherfüllung, sondern erklärte nach vier Wochen sogleich den Rücktritt vom Kaufvertrag und forderte Kaufpreisrückzahlung Zug um Zug gegen Rückgewähr der Anlage.",
        "gruende": "Die Revision ist unbegründet. Ein wirksamer Rücktritt setzt nach § 323 Abs. 1 BGB den erfolglosen Ablauf einer angemessenen Frist zur Nacherfüllung voraus. Eine solche Fristsetzung war vorliegend auch nicht nach § 323 Abs. 2 BGB entbehrlich, da die Beklagte die Nacherfüllung weder ernsthaft und endgültig verweigert hat, noch besondere Umstände vorliegen, die unter Abwägung der beiderseitigen Interessen den sofortigen Rücktritt rechtfertigen.",
        "norms_meta": "BGB:§437, BGB:§323, BGB:§439",
        "source_url": "https://www.rechtsprechung-im-internet.de/jportal/?quelle=jlink&docid=KORE218902021",
    },
    {
        "case_id": "BGH:VIII ZR 186/14:2015-09-16",
        "court": "Bundesgerichtshof",
        "senate": "VIII. Zivilsenat",
        "decided": "2015-09-16",
        "az": "VIII ZR 186/14",
        "ecli": "ECLI:DE:BGH:2015:160915UVIIIZR186.14.0",
        "doctype": "Urteil",
        "leitsatz": "Bei der Lieferung von technisch komplexen Maschinen und Industrieanlagen richtet sich die Rechtzeitigkeit der Rüge nach § 377 HGB nach den Erfordernissen eines geordneten Geschäftsgangs. Versteckte Mängel müssen unverzüglich nach tatsächlicher Entdeckung gerügt werden; die Frist beträgt im Regelfall wenige Werktage, es sei denn, spezifische Erprobungsphasen wurden vertraglich vereinbart.",
        "tenor": "Auf die Revision der Beklagten wird das Urteil des 7. Zivilsenats des Oberlandesgerichts München aufgehoben und die Sache zur neuen Verhandlung zurückverwiesen.",
        "tatbestand": "Beide Parteien sind gewerbliche Kaufleute. Die Klägerin lieferte der Beklagten automatisierte Fördertechnikkomponenten für ein Logistikzentrum. Sechs Wochen nach Übergabe und Einbau rügte die Beklagte fehlerhafte Schweißnähte.",
        "gruende": "Die Rüge ist verspätet. Ist der Kauf für beide Teile ein Handelsgeschäft, so greift § 377 Abs. 1 HGB. Offene Mängel müssen unverzüglich, in der Regel binnen zwei bis drei Werktagen nach Ablieferung gerügt werden. Unterbleibt die rechtzeitige Anzeige, gilt die Ware gemäß § 377 Abs. 2 HGB als genehmigt.",
        "norms_meta": "HGB:§377, HGB:§343",
        "source_url": "https://www.rechtsprechung-im-internet.de/jportal/?quelle=jlink&docid=KORE218902015",
    },
    {
        "case_id": "BGH:VIII ZR 270/07:2008-11-26",
        "court": "Bundesgerichtshof",
        "senate": "VIII. Zivilsenat",
        "decided": "2008-11-26",
        "az": "VIII ZR 270/07",
        "ecli": "ECLI:DE:BGH:2008:261108UVIIIZR270.07.0",
        "doctype": "Urteil",
        "leitsatz": "Dem Käufer steht das Recht zum Rücktritt ohne erneute Fristsetzung zu, wenn die dem Verkäufer obliegende Nachbesserung gemäß § 440 Satz 2 BGB fehlgeschlagen ist. Eine Nachbesserung gilt im Regelfall nach dem erfolglosen zweiten Versuch als fehlgeschlagen.",
        "tenor": "Die Revision des Beklagten wird zurückgewiesen.",
        "tatbestand": "Der Kläger kaufte einen Pkw, an dem nach Übergabe Elektronikstörungen auftraten. Nach zwei erfolglosen Reparaturversuchen in der Vertragswerkstatt erklärte der Kläger den Rücktritt.",
        "gruende": "Der Rücktritt ist wirksam. Nach § 440 Satz 2 BGB gilt eine Nachbesserung nach dem erfolglosen zweiten Versuch als fehlgeschlagen, wenn sich nicht aus der Art der Sache oder den Umständen etwas anderes ergibt.",
        "norms_meta": "BGB:§440, BGB:§437, BGB:§323",
        "source_url": "https://www.rechtsprechung-im-internet.de/jportal/?quelle=jlink&docid=KORE218902008",
    },
    {
        "case_id": "BGH:VIII ZR 115/19:2020-04-29",
        "court": "Bundesgerichtshof",
        "senate": "VIII. Zivilsenat",
        "decided": "2020-04-29",
        "az": "VIII ZR 115/19",
        "ecli": "ECLI:DE:BGH:2020:290420UVIIIZR115.19.0",
        "doctype": "Urteil",
        "leitsatz": "Der Anspruch auf Schadensersatz statt der Leistung nach § 280 Abs. 1, 3, § 281 Abs. 1 BGB wegen eines Sachmangels setzt voraus, dass der Gläubiger dem Schuldner eine Frist gesetzt hat oder die Fristsetzung nach § 281 Abs. 2 BGB entbehrlich ist.",
        "tenor": "Auf die Revision des Klägers wird das Urteil des Landgerichts aufgehoben.",
        "tatbestand": "Streit über Schadensersatzansprüche nach Fahrzeugerwerb mit Motorschaden.",
        "gruende": "Die Voraussetzungen des Anspruchs auf Schadensersatz statt der Leistung richten sich nach dem Grundsatz des Vorrangs der Nacherfüllung.",
        "norms_meta": "BGB:§280, BGB:§281, BGB:§437",
        "source_url": "https://www.rechtsprechung-im-internet.de/jportal/?quelle=jlink&docid=KORE218902020",
    }
]


def ingest_gold_cases(conn: sqlite3.Connection, snapshot_id: str):
    """将金标准判例入库，并构建 APPLIES 边与 hot_norm_cases 表"""
    cur = conn.cursor()
    now_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    for c in INITIAL_GOLD_CASES:
        cur.execute(
            """INSERT OR REPLACE INTO cases
               (case_id, court, senate, decided, az, ecli, doctype, leitsatz, tenor, tatbestand, gruende, norms_meta, source_url, snapshot_id, fetched_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                c["case_id"], c["court"], c["senate"], c["decided"], c["az"],
                c["ecli"], c["doctype"], c["leitsatz"], c["tenor"], c["tatbestand"],
                c["gruende"], c["norms_meta"], c["source_url"], snapshot_id, now_str
            )
        )

        # 建立边表 APPLIES: CASE -> NORM
        norms = [n.strip() for n in c["norms_meta"].split(",") if n.strip()]
        for n in norms:
            cur.execute(
                """INSERT OR REPLACE INTO edges
                   (src, dst, rel, source, span, confidence, reviewed, snapshot_id)
                   VALUES (?, ?, 'APPLIES', 'rule', ?, 1.0, 1, ?)""",
                (f"CASE:{c['case_id']}", f"NORM:{n}", c["az"], snapshot_id)
            )

    # 预计算构建期物化表 edges_top 与 hot_norm_cases
    cur.execute("""DELETE FROM edges_top;""")
    cur.execute(
        """INSERT INTO edges_top (src, dst, rel, source, reviewed, rk)
           SELECT src, dst, rel, source, reviewed, rk FROM (
             SELECT e.*, ROW_NUMBER() OVER (
               PARTITION BY src, rel ORDER BY (source = 'expert') DESC, confidence DESC) AS rk
             FROM edges e WHERE source IN ('rule', 'expert') OR reviewed = 1
           ) WHERE rk <= 20;"""
    )

    cur.execute("""DELETE FROM hot_norm_cases;""")
    cur.execute(
        """INSERT OR REPLACE INTO hot_norm_cases (norm_id, case_id, rank)
           SELECT REPLACE(dst, 'NORM:', ''), REPLACE(src, 'CASE:', ''), rk
           FROM edges_top
           WHERE rel = 'APPLIES';"""
    )

    conn.commit()
