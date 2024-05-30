from flask import Flask, request
from flask_cors import CORS
from werkzeug.utils import secure_filename
from classify_doc import *

app = Flask(__name__)
CORS(app, origins="*")

UPLOAD_FOLDER = '/Users/claire/Downloads/Gao/DocumentClassification/GaoDocumentClassification/UploadedFiles'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/')
def home():
    return "Hello, Flask!"

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        file = request.files['document']
        print(f"Uploading document {file.filename}")
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        return "done"

    except Exception as e:
        print(f"Couldn't upload document: {e}")
        return "failed"

if __name__ == '__main__':
    app.run(port=8000, debug=True)