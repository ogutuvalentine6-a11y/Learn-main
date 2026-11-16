#!/usr/bin/env python3
"""Seed the reels collection with a small set of verified educational videos.

Every video URL below is a real, public YouTube video. No fabricated IDs.
Admin can add/edit more via /admin/reels after this runs.

Run:  cd backend && source ../venv/bin/activate && python scripts_seed_reels.py
"""

import os
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

SEED = [
    {
        "title": "But what is a neural network?",
        "caption": "3Blue1Brown — an illustrated introduction to neural networks.",
        "videoUrl": "https://www.youtube.com/watch?v=aircAruvnKk",
        "category": "Science",
        "duration": 1140,
        "isFeatured": True,
    },
    {
        "title": "The essence of calculus",
        "caption": "3Blue1Brown — a visual introduction to what calculus really is.",
        "videoUrl": "https://www.youtube.com/watch?v=WUvTyaaNkzM",
        "category": "Mathematics",
        "duration": 1033,
        "isFeatured": True,
    },
    {
        "title": "But what is the Fourier Transform?",
        "caption": "3Blue1Brown — an intuitive visual explanation.",
        "videoUrl": "https://www.youtube.com/watch?v=spUNpyF58BY",
        "category": "Mathematics",
        "duration": 1240,
        "isFeatured": False,
    },
    {
        "title": "Learn Python — Full Course for Beginners",
        "caption": "freeCodeCamp — 4+ hours covering Python fundamentals.",
        "videoUrl": "https://www.youtube.com/watch?v=rfscVS0vtbw",
        "category": "Programming",
        "duration": 16000,
        "isFeatured": True,
    },
]


def main() -> None:
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    dbname = os.getenv("DATABASE_NAME", "learn_db")
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    db = client[dbname]
    col = db["reels"]

    inserted = skipped = 0
    for v in SEED:
        if col.find_one({"videoUrl": v["videoUrl"]}):
            skipped += 1
            continue
        doc = {
            **v,
            "thumbnailUrl": "",
            "status": "published",
            "createdAt": datetime.now(timezone.utc),
        }
        col.insert_one(doc)
        inserted += 1

    print(f"✓ Inserted {inserted}, skipped {skipped} (already exist)")
    print(f"Total reels: {col.count_documents({})}")
    print()
    print("To add more: log in as admin → /admin/reels → New video")
    print("Paste a YouTube URL, pick a category, save.")


if __name__ == "__main__":
    main()
