from io import BytesIO
from flask import Flask, request, jsonify, redirect, send_from_directory, session, url_for
from flask_cors import CORS, cross_origin
from werkzeug.utils import secure_filename
from uuid import uuid4
from classify_doc import *
from drive import *
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials
from pathlib import Path
import tempfile
import mimetypes

app = Flask(__name__, static_folder='build/')
CORS(app, origins="*", supports_credentials=True)
basedir = os.path.abspath(os.path.dirname(__file__))

# temporary local storage before uploading to drive
UPLOAD_FOLDER = '/Users/claire/Downloads/Gao/DocumentClassification/GaoDocumentClassification/UploadedFiles'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

file_map = {}

def get_drive_service(access_token):
    credentials = Credentials(token=access_token)
    return build('drive', 'v3', credentials=credentials)

def download_file_from_drive(service, file_id):
    """
    Download a file from Google Drive as a byte stream.
    """
    try:
        request = service.files().get_media(fileId=file_id)
        file_stream = BytesIO()
        downloader = MediaIoBaseDownload(file_stream, request)

        done = False
        while not done:
            _, done = downloader.next_chunk()

        file_stream.seek(0)  # Reset the stream position for reading

        file_bytes = file_stream.getvalue()

        print(f"File size: {len(file_bytes)} bytes")
        if len(file_stream.getvalue()) == 0:
            raise ValueError("Downloaded file is empty or corrupt.")
        
        return file_bytes
    except Exception as e:
        print(f"Error downloading file from Google Drive: {e}")
        return None

@app.route('/')
def home():
    # return send_from_directory(app.static_folder, 'index.html')
    return jsonify({"message": "Hello, World!"})

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/static/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)

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
            # downloads_path = str(Path.home() / "Downloads")
            # file_path = os.path.join(downloads_path, filename)

            # Download file from Google Drive
            # download_file_from_google_drive(service, file_id, file_path)
            # print("File downloaded from Google Drive to: " + file_path)
            # Download file from Google Drive
            file_bytes = download_file_from_drive(service, file_id)
            file_stream = BytesIO(file_bytes)

            if not file_stream:
                print("Failed to download file from Google Drive.")
                return

            # Determine the MIME type (e.g., 'application/pdf')
            mime_type, _ = mimetypes.guess_type(file_id)
            print(f"MIME type: {mime_type}")


            class_result = classify_document("model6", file_stream, mime_type)
            my_json = json.loads(class_result)
            file_map[file_id] = {"path": "TEMP PATH", "name": filename, "type": my_json['classification'], "class_res": class_result, "file_bytes": file_bytes}
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

            # Create a temporary file path
            temp_dir = tempfile.mkdtemp()
            temp_path = os.path.join(temp_dir, file_name)
            
            # Write bytes to temporary file
            file_bytes = file_data.get("file_bytes")
            with open(temp_path, 'wb') as f:
                f.write(file_bytes)
        
            langchain_res = langchain(temp_path)
            print("Extracting info from " + temp_path)
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
    # app.run(port=8000, debug=True)
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
    print(f"Our app is running on port {port}")