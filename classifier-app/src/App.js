import logo from './logo.png';
import pdfLogo from './pdf_logo.png';
import React, { useState, useEffect, useRef } from "react";
import { PrimeReactProvider, PrimeReactContext } from 'primereact/api';
import 'primereact/resources/themes/mira/theme.css';
import { FileUpload } from 'primereact/fileupload';
import { ProgressBar } from 'primereact/progressbar';
import { Tag } from 'primereact/tag';
import Tailwind from "primereact/passthrough/tailwind";
import axios from 'axios';
import './App.css';

function App() {
  const [data, setData] = useState('');
  const [doc_type, setDocType] = useState('N/A');
  const [confidence, setConfidence] = useState(0.0);
  const [progress_value, setProgressValue] = useState(0);
  const [info, setInfo] = useState('');

  const toast = useRef(null);


  useEffect(() => {
    axios.get('http://127.0.0.1:8000')
    .then(response => {
      setData(response.data);
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
  }, []);

  const documentUploadHandler = ({files}) => {
    const [file] = files;
    uploadDoc(file);
  };

  const uploadDoc = async (document) => {
    console.log(doc_type)
    let formData = new FormData();
    formData.append('document', document);
    setProgressValue(0);

    try {
      let response = await axios.post('http://127.0.0.1:8000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setProgressValue(100);
      setDocType([response.data.classification]);
      setConfidence([response.data.confidence]);
      console.log("Doc type: " + doc_type + "Confidence:" + confidence) 

      try {
        let result = await axios.get('http://127.0.0.1:8000/api/info')
        setInfo(JSON.stringify(result.data));
        console.log(result.data)
        console.log(info) 
      } catch (error) { 
        console.warn('Error fetching info:', error);
      }

    } catch (error) {
      console.warn('Error uploading file:', error);
      alert('Error uploading file');
    }
  };

  const onUpload = () => {
    toast.current.show({severity: 'info', summary: 'Success', detail: 'File Uploaded'});
  }

  const itemTemplate = (file, props) => {
    var display_image;
    if (file.type === 'application/pdf') {
      display_image=<img alt={"pdf logo"} role="presentation" src={pdfLogo} width={100} />
    } else{
      display_image=<img alt={""} role="presentation" src={file.objectURL} width={100} />
    }
    return (
        <div className="flex align-items-center flex-wrap grid-cols-3 gap-10">
            <div className="flex align-items-center max-h-28">
              {display_image}
            </div>
            <div className='flex items-center'>
              <div>
                <span className="flex flex-column text-left ml-3">{file.name}</span>
              </div>
            </div>
            <div className='flex items-center'>
            <Tag value={props.formatSize} severity="warning" className="px-3 py-2" />
            </div>
        </div>
    )
  }

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
          <p className="flex justify-center dm-sans-body mt-3">Powered by Azure Document Intelligence, LangChain, and Cohere.</p>
        </div>
        <div>
          <p className="flex justify-center dm-sans-body mt-1">Built with ReactJS, Flask, and Axios.</p>
        </div>
        <div className="flex justify-center dm-sans-heading mt-12">
          <h1 className="text-xl">Upload a Document</h1>
        </div>
        <div>
          <p className="flex justify-center dm-sans-body mt-3">Please make sure that your file is a pdf, png, or jpeg. The maximimum file size is 4 MB.</p>
        </div>
        <div className = "flex justify-center">
          <FileUpload name="document" customUpload uploadHandler={documentUploadHandler} auto url={'/api/upload'} 
          accept="image/jpeg,image/png,application/pdf" maxFileSize={4000000} itemTemplate={itemTemplate}
          onUpload={onUpload} progressBarTemplate={<ProgressBar value={progress_value} showValue={false}></ProgressBar>} 
          emptyTemplate={<p className="mt-[-7%]">Drag and drop files to here to upload.</p>} />
        </div>
        <div className="flex justify-center dm-sans-heading mt-10">
          <h1 className="text-xl">Classification Result</h1>
        </div>
        <div className='mt-4 dm-sans-body'>
          <p>This document falls under <span className='code'>{doc_type}</span> with a confidence of <span className='code'>{confidence}</span>.</p>
        </div>
        <div className="flex justify-center dm-sans-heading mt-10">
          <h1 className="text-xl">Information Extraction</h1>
        </div>
        <p>{info}</p>
        <p>{data}</p>
      </header>
    </div>
    </PrimeReactProvider>
  );
}

export default App;
