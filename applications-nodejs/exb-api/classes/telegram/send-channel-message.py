import configparser
import json
import asyncio
from datetime import date, datetime

from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
from telethon.tl.functions.messages import (GetHistoryRequest)
from telethon.tl.types import (
    PeerChannel
)

import threading

import os

script_path = os.path.dirname(os.path.abspath( __file__ ))

async def set_interval(func, sec):
    async def func_wrapper():
        set_interval(func, sec)
        await func()
    t = threading.Timer(sec, func_wrapper)
    t.start()
    return t


# some functions to parse json date
class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()

        if isinstance(o, bytes):
            return list(o)

        return json.JSONEncoder.default(self, o)



# Setting configuration values
api_id = '2890794'
api_hash = '2bdb9961bdb3ea6c32796e7da2aae111'

api_hash = str(api_hash)

phone = '+989375169745'
username = script_path + '/exb'

# Create the client and connect
client = TelegramClient(username, api_id, api_hash)

async def main(phone):
    await client.start()
    print("Client Created")
    # Ensure you're authorized
    if await client.is_user_authorized() == False:
        await client.send_code_request(phone)
        try:
            await client.sign_in(phone, input('Enter the code: '))
        except SessionPasswordNeededError:
            await client.sign_in(password = input('Password: '))

    
    with open(script_path + '/send-message.txt') as message_file:
        # json_data = json.load(json_file)
        message_file_lines = message_file.read()

        await client.send_message(entity=-1001556690070, message=message_file_lines)

    print("Done.")
   

with client:
    client.loop.run_until_complete(main(phone))







