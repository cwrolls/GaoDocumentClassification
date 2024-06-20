from flask import Flask, request, jsonify, redirect, session, url_for
from flask_cors import CORS, cross_origin
from werkzeug.utils import secure_filename
from uuid import uuid4
from classify_doc import *
import requests, magic

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request

import google.auth
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload


app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

UPLOAD_FOLDER = '/Users/claire/Downloads/Gao/DocumentClassification/GaoDocumentClassification/UploadedFiles'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

file_map = {}

@app.route('/authorize')
def authorize():
    flow = Flow.from_client_secrets_file(
        'client_secret.json',
        scopes=['https://www.googleapis.com/auth/drive'])
    flow.redirect_uri = 'http://127.0.0.1:8000'
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true')
    return redirect(authorization_url)

@app.route('/oauth2callback')
def oauth2callback():
    state = session['state']
    flow = Flow.from_client_secrets_file(
        'client_secret.json',
        scopes=['https://www.googleapis.com/auth/drive'],
        state=state,
        redirect_uri=url_for('oauth2callback', _external=True))
    flow.fetch_token(authorization_response=request.url)
    credentials = flow.credentials
    session['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }
    return redirect(url_for('/api/upload'))

@app.route('/api/upload', methods=['POST', 'GET'])
@cross_origin(supports_credentials=True)
def upload_file():
    if request.method == 'POST':
        try:
            file = request.files['document']
            print(f"Uploading document {file.filename}")
            file_id = str(uuid4())
            filename = secure_filename(file.filename)
            # file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            # print("file_path from upload: " + file_path)
            # file.save(file_path)

            creds, _ = google.auth.default()
            service = build("drive", "v3", credentials=creds)

            file_metadata = {"name": file.filename}
            file_type = magic.from_buffer(file.read(2048))
            media = MediaFileUpload(file.filename, mimetype=file_type)

            file_to_upload = (
                service.files()
                .create(body=file_metadata, media_body=media, fields="id")
                .execute()
            )
            print(f'File ID: {file_to_upload.get("id")}')

            results = service.files().list(pageSize=1000, fields="nextPageToken, files(id, name, mimeType, size, modifiedTime)", q='name contains "de"').execute()
            # get the results 
            items = results.get('files', [])

            class_result = classify_document("model6", file_path)
            my_json = json.loads(class_result)
            file_map[file_id] = {"path": file_path, "name": filename, "type": my_json['classification'], "class_res": class_result}
            print(f"Classification result: {class_result}")
            return jsonify({"status": "post_success", "file_id": file_id, "classification": my_json['classification'], "confidence": my_json['confidence']})
        
        except HttpError as error:
            print(f"An error occurred uploading to Drive: {error}")
            file = None

        except Exception as e:
            print(f"Couldn't upload document: {e}")
            return jsonify({"status": "failed", "error": str(e)})
    
    else:
        my_json = json.loads(class_result)
        return jsonify({"status": "post_success", "classification": my_json['classification'], "confidence": my_json['confidence']})

@app.route('/api/info', methods=['POST', 'GET'])
@cross_origin(supports_credentials=True)
def extract_info():
    if request.method == 'GET':
        try:
            file_id = request.args.get('file_id')
            if file_id not in file_map:
                raise ValueError("Invalid file ID")

            file_data = file_map[file_id]
            file_path = file_data["path"]
            doc_type = file_data["type"]
            class_result = file_data["class_res"]
            file_name = file_data["name"]
        
            langchain_res = langchain(file_path)
            print("Extracting info from " + file_path)
            print(langchain_res)

            json_res = llm(langchain_res, doc_type)
            print(f"server Answer: {json.dumps(json_res)}")
            return jsonify({"file_name": file_name, "json": json_res})

        except Exception as e:
            print(f"Couldn't get answer: {e}")
            return jsonify({"status": "failed", "error": str(e)})
    else:
        langchain_res = langchain(file_path)
        print(langchain_res)

        my_json = json.loads(class_result)

        json_res = llm(langchain_res, my_json['classification'])
        print(f"server Answer: {json.dumps(json_res)}")
        return json.dumps(json_res)


if __name__ == '__main__':
    app.run(port=8000, debug=True)