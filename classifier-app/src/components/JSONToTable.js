import React from 'react';
import './TableComponent.css';
import { Checkbox } from 'antd';

// `map` over the first object in the array
// and get an array of keys and add them
// to TH elements
function getHeadings(data) {
  return Object.keys(data[0]).map(key => {
      return <th key={key}>{key}</th>;
  });
}
  
  // `map` over the data to return
  // row data, passing in each mapped object
  // to `getCells`
function getRows(data, selectedFiles, handleCheckboxChange) {
  return data.map((obj, rowIndex) => {
    return <tr key={rowIndex}>{getCells(obj, selectedFiles, handleCheckboxChange)}</tr>;
  });
}
  
  // Return an array of cell data using the
  // values of each object
function getCells(obj, selectedFiles, handleCheckboxChange) {
  return Object.entries(obj).map(([key, value], cellIndex) => {
    if (key === 'file_name') {
      return (
        <td key={cellIndex}>
          <Checkbox onChange={() => handleCheckboxChange(value)} 
          checked={selectedFiles.some(file_name => file_name === value)}></Checkbox>
          <span className="ml-6 max-w-64">{value}</span>
        </td>
      );
    } else if (Array.isArray(value)) {
      return (
        <td key={cellIndex}>
          {value.map((item, itemIndex) => (
            <div key={itemIndex}>
              {item}
            </div>
          ))}
        </td>
      );
    } else if (typeof value === 'object' && value !== null) {
      return (
        <td key={cellIndex}>
          <table>
            <tbody>
              {Object.entries(value).map(([nestedKey, nestedValue], nestedIndex) => (
                <tr key={nestedIndex}>
                  <td style={{ maxWidth: '160px', overflowWrap: 'break-word' }}><strong>{nestedKey}</strong></td>
                  <td>{nestedValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </td>
      );
    } else {
      return (
        <td key={cellIndex}>
          {value}
        </td>
      );
    }
  });
}
  
  // Simple component that gets the
  // headers and then the rows
function JSONToTable({ data, selectedFiles, handleCheckboxChange }) {
  return (
    <table>
      <thead>
        <tr>{getHeadings(data)}</tr>
      </thead>
      <tbody>{getRows(data, selectedFiles, handleCheckboxChange)}</tbody>
    </table>
  );
}
  
export default JSONToTable;