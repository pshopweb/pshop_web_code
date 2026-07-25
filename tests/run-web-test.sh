#!/bin/bash
# Local server chalakar website test karta hai, phir server band kar deta hai.
cd "$(dirname "$0")/.."
pkill -f "http.server 8899" 2>/dev/null
sleep 1
python3 -m http.server 8899 > /dev/null 2>&1 &
SERVER=$!
sleep 4
python3 tests/web-test.py
RESULT=$?
kill $SERVER 2>/dev/null
exit $RESULT
