import logo from './logo.png';
import React, { useState, useEffect } from "react";
import { PrimeReactProvider, PrimeReactContext } from 'primereact/api';
import 'primereact/resources/themes/mira/theme.css';
import { FileUpload } from 'primereact/fileupload';
import axios from 'axios';
import './App.css';

function App() {
  const [data, setData] = useState('');

  useEffect(() => {
    // Using fetch to fetch the api from flask server, it will be redirected to proxy
    fetch('http://127.0.0.1:8000')
      .then(response => response.text())
      .then(data => setData(data))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  const documentUploadHandler = ({files}) => {
    const [file] = files;
    uploadDoc(file);
  };

  const uploadDoc = async (document) => {
    let formData = new FormData();
    formData.append('document', document);

    try {
      let response = await axios.post('http://127.0.0.1:8000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      let res = response.data;
      if (res.status !== 1) {
        alert('Error uploading file');
      } else {
        alert('File uploaded successfully');
      }
    } catch (error) {
      console.warn('Error uploading file:', error);
      alert('Error uploading file');
    }
  };

  return (
    <PrimeReactProvider>
    <div className="App">
      <header className="Gao Document Classification">
        <div className="flex justify-center mt-5">
          <img src={logo} className="app-logo" alt="logo" />
        </div>
        <div className="flex justify-center dm-sans-title mt-12">
          <h1 className="text-3xl">Document Classifier</h1>
        </div>
        <div>
          <p className="flex justify-center dm-sans-body mt-3">Built with Azure Document Intelligence, LangChain, and Cohere.</p>
        </div>
        <div className="flex justify-center dm-sans-heading mt-12">
          <h1 className="text-xl">Upload a Document</h1>
        </div>
        <div>
          <p className="flex justify-center dm-sans-body mt-3">Please make sure that your file is a pdf, png, or jpeg. The maximimum file size is 4 MB.</p>
        </div>
        <div className = "flex justify-center">
          <FileUpload name="document" uploadHandler={documentUploadHandler} auto url={'/api/upload'} accept="image/jpeg,image/png,application/pdf" maxFileSize={4000000} emptyTemplate={<p className="mt-[-7%]">Drag and drop files to here to upload.</p>} />
        </div>
        <p>{data}</p>
      </header>
    </div>
    </PrimeReactProvider>
  );
}

export default App;
