import json
import base64
import json
import os
import requests
from Crypto.Cipher import AES
import boto3
from dynamodb_json import json_util
import random

dyn = boto3.client('dynamodb', 
                  aws_access_key_id=os.environ['AWS_KEY'], 
                  aws_secret_access_key=os.environ['AWS_SECRET'], 
                  region_name="us-east-1")

def unpad(s):
    return s[:-ord(s[len(s)-1:])]

def _pad(s):
    return s + (AES.block_size - len(s) % AES.block_size) * chr(AES.block_size - len(s) % AES.block_size)

def decrypt_data(data, key, base64iv):
    b_crypt = base64.b64decode(data)
    iv = base64.b64decode(base64iv)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return unpad(cipher.decrypt(b_crypt)).decode('utf-8')

def encrypt(data, key):
    data = _pad(data)
    iv = iv_gen().encode()
    cipher = AES.new(key, AES.MODE_CBC, iv)
    #return base64.b64encode(iv + cipher.encrypt(data.encode()))
    return [base64.b64encode(iv), base64.b64encode(cipher.encrypt(data.encode()))]

def iv_gen():
    c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&'
    r=""
    for i in range(0,16):
        r+=c[random.randint(0,len(c))]
    return r

def update_dataset(meta, data, dataset):
    
    if meta['page']=='prelim':
        dataset['prelim']=data
    elif meta['page']=="mother":
        dataset['mother'] = data
    elif meta['page']=="documents":
        dataset['documents']=data
    elif meta['page']=="father":
        idx = str(meta['idx'])
        dataset['father'][idx]=data
    elif meta['page']=="child":
        idx = str(meta['idx'])
        data['matter']=meta['matter']
        dataset['child'][idx]=data
    elif meta['page']=='child2':
        idx = str(meta['idx'])
        data['matter']=meta['matter']
        dataset['child2'][idx]=data

key = base64.b64decode(os.environ['CRYPT_KEY'])

def lambda_handler(event, context):
    data = event['data']
    meta = event['metadata']
    iv=meta['iv']
    jsondata = decrypt_data(data, key, iv)

    d = json.loads(jsondata)

    if type(d)==str:
        d=json.loads(d)

    res = dyn.query(
        TableName="APAP_PFS_Form_Data",
        KeyConditionExpression="party = :p",
        ExpressionAttributeValues={
            ":p":{"S":str(meta['party'])}
        }
    )

    if res['Count']==0:
        dataset = {
            "prelim":None,
            "mother":None,
            "father":{},
            "child":{},
            "child2":{},
            "documents":None
            }
        
        update_dataset(meta, d, dataset)
        
        item = {"party":meta['party'],
                "matter_list":meta['matter_list'],
                "data":dataset}
        
    else:
        item = json_util.loads(res['Items'])[0]
        dataset = item['data']
        update_dataset(meta, d, dataset)
        item['data'] = dataset

    item = json.loads(json_util.dumps(item))
    res = dyn.put_item(
        TableName="APAP_PFS_Form_Data",
        Item=item
    )
