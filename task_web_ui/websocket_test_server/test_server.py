#!/usr/bin/env python3

import sys
import json
import asyncio
import websockets

def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <test_file.jsonl>")

    with open(sys.argv[1]) as f:
        events = f.readlines()

    async def serve(websocket, path):
        print(await websocket.recv())
        for event in events:
            print(f"sending: {event}")
            await websocket.send(event)

    start_server = websockets.serve(serve, "localhost", 4242)
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()
    

if __name__ == "__main__":
    main()