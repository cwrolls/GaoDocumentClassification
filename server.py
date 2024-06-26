from flask import Flask, request, jsonify, redirect, session, url_for
from flask_cors import CORS, cross_origin
from werkzeug.utils import secure_filename
from uuid import uuid4
from classify_doc import *
from drive import *
import magic

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload


app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

# temporary local storage before uploading to drive
UPLOAD_FOLDER = '/Users/claire/Downloads/Gao/DocumentClassification/GaoDocumentClassification/UploadedFiles'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

file_map = {}

@app.route('/api/upload', methods=['POST', 'GET'])
@cross_origin(supports_credentials=True)
def upload_file():
    if request.method == 'POST':
        try:
            id_token_str = request.headers.get('Authorization').split('Bearer ')[1]
            credentials = get_google_oauth_credentials(id_token_str)
            file = request.files['document']
            print(f"Uploading document {file.filename}")
            file_id = str(uuid4())
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            print("file_path from upload: " + file_path)
            file.save(file_path)

            drive_file_id = upload_to_drive(file_path, filename, credentials)
            print(f"File uploaded to Google Drive with ID: {drive_file_id}")

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