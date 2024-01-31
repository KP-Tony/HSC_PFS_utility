import json
import base64
import os
from Crypto.Cipher import AES
import boto3
from dynamodb_json import json_util

dyn = boto3.client('dynamodb', 
                  aws_access_key_id=os.environ['AWS_KEY'], 
                  aws_secret_access_key=os.environ['AWS_SECRET'], 
                  region_name="us-east-1")

def unpad(s):
    return s[:-ord(s[len(s)-1:])]

def decrypt_data(data, key, base64iv):
    b_crypt = base64.b64decode(data)
    iv = base64.b64decode(base64iv)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return unpad(cipher.decrypt(b_crypt)).decode('utf-8')

key = base64.b64decode(os.environ['CRYPT_KEY'])


def lambda_handler(event, context):
    if 'data' in event.keys():
        body = event
        data = event['data']
        meta = event['metadata']
    else:
        body = json.loads(event['body'])
        data = body['data']
        meta = body['metadata']
        
    jsondata = decrypt_data(data['data'], key, data['iv'])

    d = json.loads(jsondata)
    if type(d)==str:
        d=json.loads(d)

    item = {"party":meta['party'],
            "metadata":meta,
            "pages":{}}
    
    if 'setup' in body:
        #saves a query, why not
        pages=d

    else:
        res = dyn.query(
            TableName="HSC_PFS_Form_Data",
            KeyConditionExpression="party = :p",
            ExpressionAttributeValues={
                ":p":{"S":str(meta['party'])}
            }
        )
        #No result, needs setup
        if res['Count']==0:
            pages = d

        else:
            pages = json_util.loads(res['Items'])[0]
            pages = pages['pages']
            #update with new data
            for k,v in d.items():
                pages[k]=v

    #add page data to item
    for k,v in pages.items():
        item['pages'][k]=v

    item = json.loads(json_util.dumps(item))
    res = dyn.put_item(
        TableName="HSC_PFS_Form_Data",
        Item=item
    )
