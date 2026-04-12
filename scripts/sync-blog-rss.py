#!/usr/bin/env python3
"""네이버 블로그 RSS를 가져와 blog_posts.csv/json을 업데이트한다."""

import csv
import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime

RSS_URL = "https://rss.blog.naver.com/sja6123.xml"
MAX_POSTS = 50

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "assets", "data")
CSV_PATH = os.path.join(DATA_DIR, "blog_posts.csv")
JSON_PATH = os.path.join(DATA_DIR, "blog_posts.json")


def fetch_rss(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")


def parse_rss(xml_text: str) -> list[dict]:
    root = ET.fromstring(xml_text)
    posts = []

    for item in root.findall(".//item"):
        title = (item.findtext("title") or "").strip()
        guid = (item.findtext("guid") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub = (item.findtext("pubDate") or "").strip()

        url = guid if guid else link
        url = re.sub(r"\?fromRss.*$", "", url)

        try:
            dt = datetime.strptime(pub, "%a, %d %b %Y %H:%M:%S %z")
            date_str = dt.strftime("%Y-%m-%d")
        except (ValueError, TypeError):
            date_str = ""

        if title and url:
            posts.append({"title": title, "date": date_str, "link": url})

    posts.sort(key=lambda x: x["date"], reverse=True)
    return posts[:MAX_POSTS]


def write_csv(posts: list[dict], path: str) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["title", "date", "link"])
        writer.writeheader()
        writer.writerows(posts)


def write_json(posts: list[dict], path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)
        f.write("\n")


def read_existing_json(path: str) -> list[dict]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def main() -> int:
    print(f"[sync-blog] RSS 가져오는 중: {RSS_URL}")
    try:
        xml_text = fetch_rss(RSS_URL)
    except Exception as e:
        print(f"[sync-blog] RSS 가져오기 실패: {e}", file=sys.stderr)
        return 1

    posts = parse_rss(xml_text)
    if not posts:
        print("[sync-blog] RSS에서 글을 찾지 못했습니다.", file=sys.stderr)
        return 1

    print(f"[sync-blog] {len(posts)}개 블로그 글 파싱 완료")

    existing = read_existing_json(JSON_PATH)
    if existing == posts:
        print("[sync-blog] 변경 없음 — 업데이트 생략")
        return 2  # no changes

    os.makedirs(DATA_DIR, exist_ok=True)
    write_csv(posts, CSV_PATH)
    write_json(posts, JSON_PATH)

    new_count = len(set(p["link"] for p in posts) - set(p["link"] for p in existing))
    print(f"[sync-blog] 업데이트 완료: 새 글 {new_count}개, 총 {len(posts)}개")
    for p in posts[:5]:
        print(f"  [{p['date']}] {p['title']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
