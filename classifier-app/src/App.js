import logo from './logo.png';
import pdfLogo from './pdf_logo.png';
import React, { useState, useRef } from "react";
import { PrimeReactProvider } from 'primereact/api';
import 'primereact/resources/themes/mira/theme.css';
import { FileUpload } from 'primereact/fileupload';
import { ProgressBar } from 'primereact/progressbar';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import classNames from 'classnames';
import { Tag } from 'primereact/tag';
import JSONToTable from './components/JSONToTable';
import CircularProgress from "@mui/material/CircularProgress";
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const firstRender = useFirstRender();
  const uploadRef = useRef(null);

  const clearFiles = () => {
    uploadRef.current.clear()
    setFiles([]);
  }


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
    const newFiles = Array.from(files).map(file => ({
      id: uuidv4(),
      file,
      name: file.name,
      docType: '',
      confidence: 0,
      info: {},
      classLoading: true,
      infoLoading: false,
    }));

    newFiles.forEach(fileData => uploadDoc(fileData));
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const uploadDoc = async (document) => {
    const { id, file } = document;
   
    let formData = new FormData();
    formData.append('document', file);

    try {

      let response = await axios.post('http://127.0.0.1:8000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const { file_id } = response.data;

      const updatedFileData = {
        ...document,
        docType: response.data.classification,
        confidence: response.data.confidence,
        classLoading: false,
        infoLoading: true,
      };
      setFiles(prevFiles => prevFiles.map(file => file.id === id ? updatedFileData : file));
      console.log("Doc type: " + response.data.classification + ", Confidence:" + response.data.confidence);
      
      try {
        let result = await axios.get(`http://127.0.0.1:8000/api/info?file_id=${file_id}`);
        console.log("result.data: ", result.data);
        let name = result.data.file_name;
        let json_str = "{"+((result.data)['json']).substring(11, ((result.data)['json']).length - 6)+"}";
        console.log("json_str:");
        console.log(json_str)

        let file_name_json = {"file_name": name};
        console.log("file_name_json:");
        console.log(file_name_json);

        let parsedJson = JSON.parse(json_str);
        console.log("parsed json:");
        console.log(parsedJson);

        let total_json = Object.assign(file_name_json, parsedJson);
        console.log("total json:")
        console.log(total_json)
        
        const updatedFileInfo = {
          ...updatedFileData,
          info: total_json,
          infoLoading: false,
        };
        
        setFiles(prevFiles => prevFiles.map(file => file.id === id ? updatedFileInfo : file));
      } catch (error) { 
        setFiles(prevFiles => prevFiles.map(file => file.id === id ? { ...file, infoLoading: false } : file));
        console.warn('Error fetching info:', error);
      }

    } catch (error) {
      setFiles(prevFiles => prevFiles.map(file => file.id === id ? { ...file, classLoading: false } : file));
      console.warn('Error uploading file:', error);
      alert('Error uploading file');
    }
  };

  const handleCheckboxChange = (file) => {
    console.log("selected files: ", selectedFiles);
    setSelectedFiles(prevSelectedFiles => {
      if (prevSelectedFiles.includes(file)) {
        return prevSelectedFiles.filter(selectedFile => selectedFile !== file);
      } else {
        return [...prevSelectedFiles, file];
      }
    });
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
  
  const groupFilesByDocType = (files) => {
    return files.reduce((acc, file) => {
      const { docType } = file;
      if (!acc[docType]) {
        acc[docType] = [];
      }
      acc[docType].push(file);
      return acc;
    }, {});
  };

  const groupedFiles = groupFilesByDocType(files);

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
          <FileUpload name="document" ref={uploadRef} customUpload multiple uploadHandler={documentUploadHandler} auto 
          url={'/api/upload'} accept="image/jpeg,image/png,application/pdf" maxFileSize={4000000} itemTemplate={itemTemplate}
          progressBarTemplate=
          {(files.size > 0 && files[0].classLoading) ? (
            <ProgressBar mode="indeterminate" style={{height: '4px'}}></ProgressBar>
          ) : (
            <ProgressBar mode="indeterminate" style={{height: '0px'}}></ProgressBar>
          )}
          emptyTemplate={<p className="mt-[-7%]">Drag and drop files to here to upload.</p>} 
          pt = {{
            content: { className: firstRender ? ('justify-center relative items-center bg-slate-100') : ('justify-center relative bg-slate-100') },
            file: { className: classNames('flex items-center flex-wrap w-72 h-28', 'border border-gray-300 border-2 rounded gap-2 gap-x-2 mb-2 mr-2')},
            chooseButton: { className: 'choose-button fill flex items-center'},
            chooseIcon: { className: 'ml-3'},
          }}
          />
        </div>
        <div className='flex justify-center mt-4'>
            <Button label="Clear" raised icon={(options) => <ClearOutlinedIcon {...options.iconProps} />} className='clear-button'
            onClick={clearFiles}
            pt={{
              icon: {className: 'ml-2'},
            }}/>
        </div>
        <div className="flex justify-center dm-sans-heading mt-10">
          <h1 className="text-xl">Classification Result</h1>
        </div>
        {files.map((file) => (
            <div key={file.id} className='mt-4 dm-sans-body flex justify-center'>
              <p>
                <span className="code">{file.name}</span> falls under {" "}
                <span className='code'>
                  {file.classLoading ? (
                    <CircularProgress color="inherit" size={12} thickness={4} />
                  ) : (
                    file.docType
                  )}
                </span>
                {" "} with a confidence of {" "}
                <span className='code'>
                  {file.classLoading ? (
                    <CircularProgress color="inherit" size={12} thickness={4} />
                  ) : (
                    file.confidence
                  )}
                </span>
                .
              </p>
            </div>
          ))}
        <div className="flex justify-center dm-sans-heading mt-10 mb-4">
          <h1 className="text-xl">Information Extraction</h1>
        </div>
        {Object.entries(groupedFiles).map(([docType, files]) => (
          <div key={docType} className="flex flex-col items-center mt-4 mb-10">
            <h1 className="text-x mb-2 dm-sans-heading">{docType}</h1>
            {files.some(file => file.infoLoading || !file.info) ? (
              <CircularProgress className="mt-8" color="inherit" size={20} thickness={6} />
            ) : (
              <JSONToTable data={files.map(file => file.info)} selectedFiles={selectedFiles}
              handleCheckboxChange={handleCheckboxChange}/>
            )}
          </div>
        ))}
        </header>
      </div>
    </PrimeReactProvider>
  );
}

export default App;
