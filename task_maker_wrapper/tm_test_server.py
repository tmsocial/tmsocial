#!/usr/bin/env python3
# Proof of concept of a server that executes task-maker
# to evaluate a problem and produces a websocket stream

import sys
import os
import json
import base64
import asyncio
import subprocess
import websockets


from adapter import process_event


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <task>")
        exit(1)

    args = ["task-maker", "--ui", "json", "--cache", "reevaluate", "--task-dir", sys.argv[1], os.path.join(os.getcwd(), "solution.cpp")]

    async def serve(websocket, path):
        request = json.loads(await websocket.recv())
        print(request)

        with open(os.path.join(os.getcwd(), "solution.cpp"), "w") as f:
            f.write(base64.decodestring(request["solution"]["content"].encode("utf-8")).decode("utf-8"))

        with subprocess.Popen(args, stdout=subprocess.PIPE, universal_newlines=True) as p:
            for event in p.stdout:
                print(f"sending: {event}")
                event_json = json.loads(event)
                for e in process_event(event_json):
                    await websocket.send(json.dumps(e))

    start_server = websockets.serve(serve, "localhost", 4242)
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()
    

if __name__ == "__main__":
    main()