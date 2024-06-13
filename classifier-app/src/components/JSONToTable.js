import React from 'react';
import './TableComponent.css';

// `map` over the first object in the array
// and get an array of keys and add them
// to TH elements
function getHeadings(data) {
  return Object.keys(data[0]).map(key => {
      return <th>{key}</th>;
  });
}
  
  // `map` over the data to return
  // row data, passing in each mapped object
  // to `getCells`
function getRows(data) {
  return data.map(obj => {
    return <tr>{getCells(obj)}</tr>;
  });
}
  
  // Return an array of cell data using the
  // values of each object
function getCells(obj) {
    return Object.values(obj).map((value, cellIndex) => {
        // if (Array.isArray(value)) {
        //   return (
        //     <td key={cellIndex}>
        //       {value.map((item, itemIndex) => (
        //         <React.Fragment key={itemIndex}>
        //           {item}
        //           {itemIndex < value.length - 1 && <br />}
        //         </React.Fragment>
        //       ))}
        //     </td>
        //   );
        // } else {
        //   return <td key={cellIndex}>{value}</td>;
        // }
        if (Array.isArray(value)) {
          return (
            <td key={cellIndex}>
              {value.map((item, itemIndex) => (
                <React.Fragment key={itemIndex}>
                  {item}
                  {itemIndex < value.length - 1 && <br />}
                </React.Fragment>
              ))}
            </td>
          );
        } else if (typeof value === 'object' && value !== null) {
          return (
            <td key={cellIndex}>
              <JSONToTable data={[value]} />
            </td>
          );
        } else {
          return <td key={cellIndex}>{value}</td>;
        }
    });    
}
  
  // Simple component that gets the
  // headers and then the rows
function JSONToTable({ data }) {
  return (
    <table>
      <thead>{getHeadings(data)}</thead>
      <tbody>{getRows(data)}</tbody>
    </table>
  );
}
  
export default JSONToTable;