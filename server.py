from flask import Flask, request, jsonify, redirect, session, url_for
from flask_cors import CORS, cross_origin
from werkzeug.utils import secure_filename
from uuid import uuid4
from classify_doc import *
from drive import *
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

# temporary local storage before uploading to drive
UPLOAD_FOLDER = '/Users/claire/Downloads/Gao/DocumentClassification/GaoDocumentClassification/UploadedFiles'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

file_map = {}

def get_drive_service(access_token):
    credentials = Credentials(token=access_token)
    return build('drive', 'v3', credentials=credentials)

def download_file_from_google_drive(service, file_id, destination):
    try:
        request = service.files().get_media(fileId=file_id)
        with open(destination, 'wb') as f:
            downloader = MediaIoBaseDownload(f, request)
            done = False
            while done is False:
                status, done = downloader.next_chunk()
                print("Download %d%%." % int(status.progress() * 100))
    except HttpError as error:
        print(f"An error occurred: {error}")
        return None
    return destination

@app.route('/api/upload', methods=['POST', 'GET'])
@cross_origin(supports_credentials=True)
def upload_file():
    if request.method == 'POST':
        try:
            data = request.json
            print(data)
            file_id = data['file_id']
            access_token = data['access_token']

            # Get Google Drive service
            service = get_drive_service(access_token)

            # Set destination path
            filename = data['name']
            print("file name: " + data['name'])
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

            # Download file from Google Drive
            download_file_from_google_drive(service, file_id, file_path)
            print("File downloaded from Google Drive to: " + file_path)

            class_result = classify_document("model6", file_path)
            my_json = json.loads(class_result)
            file_map[file_id] = {"path": file_path, "name": filename, "type": my_json['classification'], "class_res": class_result}
            print(f"Classification result: {class_result}")
            return jsonify({"status": "post_success", "file_id": file_id, "classification": my_json['classification'], "confidence": my_json['confidence']})
        
        except HttpError as error:
            print(f"An error occurred downloading from Drive: {error}")
            return jsonify({"status": "failed", "error": str(error)})

        except Exception as e:
            print(f"Couldn't process document: {e}")
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