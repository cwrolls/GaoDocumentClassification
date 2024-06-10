import logo from './logo.png';
import pdfLogo from './pdf_logo.png';
import React, { useState, useEffect, useRef } from "react";
import { PrimeReactProvider, PrimeReactContext } from 'primereact/api';
import 'primereact/resources/themes/mira/theme.css';
import { FileUpload } from 'primereact/fileupload';
import { ProgressBar } from 'primereact/progressbar';
import classNames from 'classnames';
import { Tag } from 'primereact/tag';
import JSONPretty from 'react-json-pretty';
import CircularProgress from "@mui/material/CircularProgress";
import axios from 'axios';
import './App.css';

function App() {
  const [class_loading, setClassLoading] = useState(false);
  const [info_loading, setInfoLoading] = useState(false);
  const [file_name, setFilename] = useState('N/A');
  const [doc_type, setDocType] = useState('N/A');
  const [confidence, setConfidence] = useState(0.0);
  const [info, setInfo] = useState('');

  const firstRender = useFirstRender();

/*
  useEffect(() => {
    axios.get('http://127.0.0.1:8000')
    .then(response => {
      setData(response.data);
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
  }, []);
  */

  function useFirstRender() {
    const ref = useRef(true);
    const firstRender = ref.current;
    ref.current = false;
    return firstRender;
  }

  const documentUploadHandler = ({files}) => {
    // const [file] = files;
    // uploadDoc(file);
    for (const file of files) {
      uploadDoc(file);
    }
  };

  const uploadDoc = async (document) => {
    console.log(doc_type)
    let formData = new FormData();
    formData.append('document', document);
    setClassLoading(true);

    formData.get('document').name === 'blob' ? setFilename('blobs') : setFilename(formData.get('document').name);

    try {

      let response = await axios.post('http://127.0.0.1:8000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setDocType([response.data.classification]);
      setConfidence([response.data.confidence]);
      setClassLoading(false);
      console.log("Doc type: " + doc_type + ", Confidence:" + confidence)

     /*  
      setDocType("remittance");
      setClassLoading(false); */

      try {
        setInfoLoading(true);
        let result = await axios.get('http://127.0.0.1:8000/api/info')
        let json_str = '"{'+JSON.stringify(result.data).substring(13, JSON.stringify(result.data).length - 9)+'\\n}"'
        console.log(json_str)
        setInfo(JSON.parse(json_str));
        console.log(result.data)
        console.log(info) 
        setInfoLoading(false);
      } catch (error) { 
        setInfoLoading(true);
        console.warn('Error fetching info:', error);
      }

    } catch (error) {
      setClassLoading(false);
      console.warn('Error uploading file:', error);
      alert('Error uploading file');
    }
  };

  const itemTemplate = (file, props) => {
    var display_image;

    if (file.type === 'application/pdf') {
      display_image=<img alt={"pdf logo"} role="presentation" src={pdfLogo} width={40} />
    } else{
      display_image=<img alt={""} role="presentation" src={file.objectURL} width={40} />
    }
    return (
        <div className="flex align-items-center flex-wrap grid-cols-3 gap-6 ">
          <div className="flex align-items-center max-h-28">
            {display_image}
          </div>
          <div className='flex items-center'>
            <span className="flex flex-column text-left ml-3">{file.name}</span>
          </div>
          <div className='flex items-center'>
            <Tag value={props.formatSize} severity="success" className="px-3 py-2" />
          </div>
        </div>
    )
  }

  return (
    <PrimeReactProvider>
    <div>
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
          <FileUpload name="document" customUpload multiple uploadHandler={documentUploadHandler} auto url={'/api/upload'} 
          accept="image/jpeg,image/png,application/pdf" maxFileSize={4000000} itemTemplate={itemTemplate}
          progressBarTemplate=
          {class_loading ? (
            <ProgressBar mode="indeterminate" style={{height: '4px'}}></ProgressBar>
          ) : (
            <ProgressBar mode="indeterminate" style={{height: '0px'}}></ProgressBar>
          )}
          emptyTemplate={<p className="mt-[-7%]">Drag and drop files to here to upload.</p>} 
          pt= {{
            content: { className: firstRender ? ('justify-center relative items-center bg-slate-100') : ('justify-center relative bg-slate-100') },
            // content: { className: 'justify-center relative bg-slate-100 flex-wrap' },
            file: { className: classNames('flex items-center flex-wrap w-72', 'border border-gray-300 border-2 rounded gap-2 gap-x-2 mb-2 mr-2')},
            chooseButton: { className: 'choose-button fill flex items-center'},
            chooseIcon: { className: 'ml-3'},
          }}
          />
        </div>
        <div className="flex justify-center dm-sans-heading mt-10">
          <h1 className="text-xl">Classification Result</h1>
        </div>
        <div className='mt-4 dm-sans-body flex justify-center'>
          <p><span className = "code">{file_name}</span> falls under {" "}
            <span className='code'> 
              {class_loading ? ( 
                <CircularProgress color="inherit" size={12} thickness={4}/>
              ) : (
                doc_type
              )}</span> 
            {" "} with a confidence of {" "}
            <span className='code'> 
              {class_loading ? ( 
                <CircularProgress color="inherit" size={12} thickness={4}/>
              ) : (
                confidence
              )}</span> 
            .</p>
        </div>
        <div className="flex justify-center dm-sans-heading mt-10">
          <h1 className="text-xl">Information Extraction</h1>
        </div>
        <div className='mt-2 mb-12 flex justify-center'>
          {(class_loading || info_loading) ? ( 
            <CircularProgress className = "mt-8" color="inherit" size={20} thickness={6}/>
          ) : (
            <JSONPretty id="json-pretty" booleanStyle="color: #000000;" stringStyle="color: #000000;" valueStyle="color: #000000;" mainStyle="background-color: #FFFFFF; color: #FFFFFF; font-size: 0.9em; font-family: 'DM Mono', monospace; font-weight: 500; font-style: normal;" keyStyle="background-color: #E6E6E6; padding: 3px 10px 3px 10px; width: auto; border-radius: 8px; line-height: 250%; color: rgb(94, 129, 172);" data={info}></JSONPretty>
          )}
        </div>
        </header>
      </div>
    </PrimeReactProvider>
  );
}

export default App;
