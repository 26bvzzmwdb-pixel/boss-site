#!/usr/bin/env python3
"""Regenerate buildlog.json (public git history = build log) and leaderboard.json (snapshot of the live board).
Run from repo root before committing: python3 tools/build_data.py"""
import json, subprocess, urllib.request, datetime
log = subprocess.run(["git","log","--format=%H%x1f%cI%x1f%s","-n","400"],capture_output=True,text=True).stdout.strip().split("\n")
items=[]
for l in log:
    h,d,s=l.split("\x1f"); s=s.replace(" (NOT DEPLOYED)","").replace(", pending Noah","").replace(" (NOT DEPLOYED, pending Noah)","")
    items.append({"h":h[:7],"full":h,"t":d,"s":s})
days=sorted({i["t"][:10] for i in items})
json.dump({"generated":datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
           "total":len(items),"first":items[-1]["t"] if items else None,"active_days":len(days),"commits":items[:60]},
          open("buildlog.json","w"),indent=0)
try:
    j=json.load(urllib.request.urlopen("https://boss-runner-fto6.onrender.com/api/leaderboard",timeout=60))
    out={"generated":datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),"round":j.get("round"),
         "round_info":j.get("round_info"),"leaderboard":[{k:e.get(k) for k in ("name","score","verified","holder","bosses","dist","ts")} for e in j.get("leaderboard",[])[:10]]}
    json.dump(out,open("leaderboard.json","w"),indent=0)
except Exception as e: print("leaderboard snapshot skipped:",e)
print("ok",len(items),"commits")
