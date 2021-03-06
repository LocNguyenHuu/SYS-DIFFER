import React, { Component } from 'react';
import _ from 'lodash';
import { withRouter } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import * as d3 from 'd3';
import Zoom from '@material-ui/core/Zoom';
import { withStyles } from '@material-ui/core/styles';
import Tooltip from '@material-ui/core/Tooltip';
import compose from 'recompose/compose';
import DbDisplayContainer from './DbDisplayContainer.jsx';
import DiffDbDisplayContainer from './DiffDbDisplayContainer.jsx';
// import SaveLoadDisplay from '../components/SaveLoadDisplay.jsx';
import loadingIcon from '../../assets/5pSf.gif';
import getQuery from '../query';

const { remote } = require('electron');

const main = remote.require('./electron.js');
const electron = require('electron');

const { ipcRenderer } = electron;

// options for connecting to databases
const initOptions = {
  connect(client, dc, useCount) {
    const cp = client.connectionParameters;
    // console.log('Connected to database:', cp.database);
  },
  disconnect(client, dc) {
    const cp = client.connectionParameters;
    // console.log('Disconnecting from database:', cp.database);
  },
  query(e) {
    // console.log('QUERY:', e.query);
  },
  receive(data, result, e) {
    // console.log('DATA: ', data);
  },
};

const pgp = require('pg-promise')(initOptions);

class MainContainer extends Component {
  constructor(props) {
    super(props);

    this.queued = false;

    this.state = {
      devDb: [],
      prodDb: [],
      diffDb: [],
      script: [],
      devDbDisplay: true,
      prodDbDisplay: false,
      diffDbDisplay: false,
      scriptDisplay: false,
      // saveLoadMenu: false,
      backgroundColors: {},
      showLoadingScreen: true,
      addColor: 'rgba(60, 171, 119, 0.8)',
      deleteColor: 'rgba(212, 95, 106, 0.8)',
      modifyColor: 'rgba(241, 214, 8, 0.8)',
      devDbConn: null,
      prodDbConn: null,
      currentDevDb: '',
      currentProdDb: '',
      timer: null,
      isMounted: false,
    };

    this.buildDbObjects = this.buildDbObjects.bind(this);
    this.changeDisplay = this.changeDisplay.bind(this);
    this.addScript = this.addScript.bind(this);
    this.removeScript = this.removeScript.bind(this);
    this.setBackgroundColor = this.setBackgroundColor.bind(this);
    this.removeAllChanges = this.removeAllChanges.bind(this);
    this.addAllChanges = this.addAllChanges.bind(this);
    this.openScriptWindow = this.openScriptWindow.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.handleSelectWithId = this.handleSelectWithId.bind(this);
    this.selectAll = this.selectAll.bind(this);
    this.refreshPage = this.refreshPage.bind(this);
    this.setDbInfo = this.setDbInfo.bind(this);
    this.diffDatabases = this.diffDatabases.bind(this);
    this.drawLines = this.drawLines.bind(this);
  }

  /**
   * Getting database URL from entry page (either entire URL at top, or by creating URL from inputs)
   */
  componentDidMount() {
    this.buildDbObjects();
  }

  /* eslint-disable */
  /**
   * Query databases for metadata and build table objects for devDb, prodDb, and diffDb arrays.
   */
  buildDbObjects() {
    let {
      input1,
      input2,
      inputLinkSchema1,
      inputLinkSchema2,
      inputObj1User,
      inputObj1Pass,
      inputObj1Host,
      inputObj1Port,
      inputObj1Dbname,
      inputObj2User,
      inputObj2Pass,
      inputObj2Host,
      inputObj2Port,
      inputObj2Dbname,
      inputObj1Schema,
      inputObj2Schema,
    } = this.props;

    if (input1 === '' || input2 === '') {
      input1 = `postgres://${inputObj1User}:${
        inputObj1Pass
      }@${inputObj1Host}:${inputObj1Port}/${
        inputObj1Dbname
      }`;

      input2 = `postgres://${inputObj2User}:${
        inputObj2Pass
      }@${inputObj2Host}:${inputObj2Port}/${
        inputObj2Dbname
      }`;

      inputLinkSchema1 = inputObj1Schema;
      inputLinkSchema2 = inputObj2Schema;
    }

    const query = getQuery(inputLinkSchema1);
    const query2 = getQuery(inputLinkSchema2);
    
    let devDbConn;
    let prodDbConn;

    // connect to each database
    if (this.state.devDbConn === null) {
      console.log('connecting to dev db');
      devDbConn = pgp(input1);
    } else {
      devDbConn = this.state.devDbConn;
    }

    if (this.state.prodDbConn === null) {
      console.log('connecting to prod db');
      prodDbConn = pgp(input2);
    } else {
      prodDbConn = this.state.prodDbConn;
    }

    const { setDbInfo, diffDatabases } = this;
    let devDb;
    let prodDb;
    let diffDb;

    // // query dev database for schema info
    // devDbConn.any(query2).then((schemaInfo) => {
    //   devDb = setDbInfo(schemaInfo);

    //   // query production database for schema info
    //   prodDbConn.any(query).then((schemaInfo2) => {
    //       prodDb = setDbInfo(schemaInfo2);
    //     })
    //     .then(() => {
    //       // Determine differences between databases.
    //       diffDb = diffDatabases(devDb, prodDb);

    //       // Create database arrays to sort so that common tables appear first for easier visual comparison
    //       let commonTablesArray = [];
    //       let differentTablesArray = [];

    //       // Sort devDb.
    //       devDb.forEach((table) => {
    //         const foundTable = _.find(prodDb, { name: table.name });

    //         // tables that in both databases:
    //         if (foundTable !== undefined) {
    //           commonTablesArray.push(table);
    //         } else {
    //           // tables only in one database or the other
    //           differentTablesArray.push(table);
    //         }
    //       });

    //       // combine arrays of databases (tables in both databases appear first)
    //       const sortedDevDb = commonTablesArray.concat(differentTablesArray);
    //       commonTablesArray = [];
    //       differentTablesArray = [];

    //       // Sort prodDb.
    //       prodDb.forEach((table) => {
    //         const foundTable = _.find(devDb, { name: table.name });
    //         // tables in both databases
    //         if (foundTable !== undefined) {
    //           commonTablesArray.push(table);
    //         } else {
    //           // tables only in one db or the other
    //           differentTablesArray.push(table);
    //         }
    //       });

    //       // combine arrays of databases (tables in both databases appear first)
    //       const sortedProdDb = commonTablesArray.concat(differentTablesArray);
    //       commonTablesArray = [];
    //       differentTablesArray = [];

    //       // Sort diffDb.
    //       diffDb.forEach((table) => {
    //         const foundTable1 = _.find(devDb, { name: table.name });
    //         const foundTable2 = _.find(prodDb, { name: table.name });

    //         if (foundTable1 !== undefined && foundTable2 !== undefined) {
    //           commonTablesArray.push(table);
    //         } else {
    //           differentTablesArray.push(table);
    //         }
    //       });

    //       const sortedDiffDb = commonTablesArray.concat(differentTablesArray);

    //       devDbConn.end();
    //       prodDbConn.end();

    //       this.setState({
    //         devDb: sortedDevDb,
    //         prodDb: sortedProdDb,
    //         diffDb: sortedDiffDb,
    //         showLoadingScreen: false,
    //       });
    //     });
    // });

    let sco;
    let sco2;

    // query dev database for schema info
    devDbConn.connect()
    .then(obj => {
        sco = obj;
        return sco.any(query2);
      })
      .then((schemaInfo) => {
      devDb = setDbInfo(schemaInfo);
      // query production database for schema info
      prodDbConn.connect()
      .then(obj2 => {

        sco2 = obj2;
        return sco2.any(query);
      })
      .then((schemaInfo2) => {
          prodDb = setDbInfo(schemaInfo2);
          console.log(schemaInfo2, prodDb,'dead2')
        })
        .then(() => {
          // Determine differences between databases.
          diffDb = diffDatabases(devDb, prodDb);

          // Create database arrays to sort so that common tables appear first for easier visual comparison
          let commonTablesArray = [];
          let differentTablesArray = [];

          // Sort devDb.
          devDb.forEach((table) => {
            const foundTable = _.find(prodDb, { name: table.name });

            // tables that in both databases:
            if (foundTable !== undefined) {
              commonTablesArray.push(table);
            } else {
              // tables only in one database or the other
              differentTablesArray.push(table);
            }
          });

          // combine arrays of databases (tables in both databases appear first)
          const sortedDevDb = commonTablesArray.concat(differentTablesArray);
          commonTablesArray = [];
          differentTablesArray = [];

          // Sort prodDb.
          prodDb.forEach((table) => {
            const foundTable = _.find(devDb, { name: table.name });
            // tables in both databases
            if (foundTable !== undefined) {
              commonTablesArray.push(table);
            } else {
              // tables only in one db or the other
              differentTablesArray.push(table);
            }
          });

          // combine arrays of databases (tables in both databases appear first)
          const sortedProdDb = commonTablesArray.concat(differentTablesArray);
          commonTablesArray = [];
          differentTablesArray = [];

          // Sort diffDb.
          diffDb.forEach((table) => {
            const foundTable1 = _.find(devDb, { name: table.name });
            const foundTable2 = _.find(prodDb, { name: table.name });

            if (foundTable1 !== undefined && foundTable2 !== undefined) {
              commonTablesArray.push(table);
            } else {
              differentTablesArray.push(table);
            }
          });

          const sortedDiffDb = commonTablesArray.concat(differentTablesArray);

          this.setState({
            devDb: sortedDevDb,
            prodDb: sortedProdDb,
            diffDb: sortedDiffDb,
            showLoadingScreen: false,
            devDbConn,
            prodDbConn,
          });
        })
        .finally(() => {
          if (sco2) {
            sco2.done();
          }
        });
    })
    .finally(() => {
      if (sco) {
        sco.done();
      }
    });
  }

  /**
   * Parse schemaInfo to create table objects.
   * @param {string} dbName - name of the database (dev or prod)
   * @param {object} schemaInfo - the metadata about tables returned from database
   */
  setDbInfo(schemaInfo) {
    // this array will contain all the table objects
    const dbCopy = [];
    // table object to create each table, then push onto dbCopy array
    let table = {};
    schemaInfo.forEach((row) => {
      const {
        table_name,
        column_name,
        is_nullable,
        data_type,
        character_maximum_length,
        constraint_types,
        foreign_table_name,
        foreign_column_name,
        constraint_names,
      } = row;

      if (table.name === undefined) {
        table.name = table_name;
      }

      if (table.name !== undefined && table.name !== table_name) {
        // Add table to oldDb array.
        dbCopy.push(table);
        // Reset table.
        table = {};
        table.name = table_name;
      }

      // Create new column object to push into table object.
      const column = {};
      column.name = column_name;
      column.isNullable = (is_nullable === 'YES');

      // This is for data-types only:
      column.dataType = data_type;
      if (data_type === 'character varying') { column.dataType = `varchar (${character_maximum_length})`; }
      if (data_type === 'double precision') column.dataType = 'float';

      // For contraints only:
      if (constraint_types !== null) {
        const constraintTypesArray = constraint_types.split(', ');
        const constraintNamesArray = constraint_names.split(', ');
        column.constraintTypes = [];
        column.constraintNames = [];

        constraintTypesArray.forEach((constraintType, index) => {
          let constraintTypeTemp = constraintType;
          if (constraintType === 'PRIMARY KEY') {
            column.constraintTypes.unshift(constraintTypeTemp);
            column.constraintNames.unshift(constraintNamesArray[index]);
       
          }
          // create Foreign Key statement
          else if (constraintType === 'FOREIGN KEY') { 
            constraintTypeTemp = `REFERENCES ${foreign_column_name} IN ${foreign_table_name}`; 
            column.constraintTypes.push(constraintTypeTemp);
            column.constraintNames.push(constraintNamesArray[index]);
          }
            // add another key in column obj
          else {
            column.constraintTypes.push(constraintTypeTemp);
            column.constraintNames.push(constraintNamesArray[index]);
          }
          
        });
      }

      // Add new column object to table.
      if (table.columns === undefined) table.columns = [column];
      else table.columns.push(column);
    });


    // Sort column object so that primary key column appears first.
    // table.columns.sort((a,b) => {
    //   console.log('a, b', a, b)
    //   console.log('a.c, b,c', a.constraintTypes, b.constraintTypes)
    //   if(a.constraintTypes !== undefined && a.constraintTypes.includes('PRIMARY KEY')) {
    //     console.log('a < b');
    //     return -1
    //   } else if (b.constraintTypes !== undefined && b.constraintTypes.includes('PRIMARY KEY')) {
    //     console.log('a < b');
    //     return 1;
    //   } else {
    //     console.log('a = b');
    //     return 0;
    //   }
    // });

    // Push the last table.
    dbCopy.push(table);

    return dbCopy;
  };

  /**
     * Create diffDb by comparing table objects in database arrays.
     * @param {array} devDb
     * @param {array} prodDb
     */
    diffDatabases(devDb, prodDb) {
      // make a deep copy of prodDb
      const diffDb = JSON.parse(JSON.stringify(prodDb));
      const diffDbColors = {};
      const backgroundColors = {};
      const { addColor, deleteColor, modifyColor } = this.state;

      // Check for additions and modifications.
      devDb.forEach((table) => {
        const foundTable = _.find(diffDb, { name: table.name });

        if (foundTable === undefined) {
          // Table does not exist.
          diffDb.push(table);
          // Add color scheme.
          diffDbColors[`${table.name}`] = addColor;
          backgroundColors[`${table.name}`] = false;
        } else {
          // Table exists.
          // Check columns.
          table.columns.forEach((column) => {
            const foundColumn = _.find(foundTable.columns, {
              name: column.name,
            });

            if (foundColumn === undefined) {
              // Column does not exist.
              foundTable.columns.push(column);
              // Add color scheme.
              diffDbColors[`${table.name}-${column.name}`] = addColor;
              backgroundColors[`${table.name}-${column.name}`] = false;
            } else {
              // Column exists.
              // Check column properties.

              // Check data type.
              if (column.dataType !== foundColumn.dataType) {
                // Property has been modified.
                foundColumn.dataType = column.dataType;
                // Add color scheme.
                diffDbColors[`${table.name}-${column.name}-dataType-${column.dataType}`] = modifyColor;
                backgroundColors[`${table.name}-${column.name}-dataType-${column.dataType}`] = false;
              }

              // Check not null constraint.
              if (
                column.isNullable === false
                && column.isNullable !== foundColumn.isNullable
              ) {
                // Property has been modified.
                foundColumn.isNullable = column.isNullable;
                // Add color scheme.
                diffDbColors[`${table.name}-${column.name}-nullable-${column.isNullable}`] = addColor;
                backgroundColors[`${table.name}-${column.name}-nullable-${column.isNullable}`] = false;
              }

              // Check constraint types.
              if (column.constraintTypes !== undefined) {
                column.constraintTypes.forEach((constraintType) => {
                  if (
                    foundColumn.constraintTypes === undefined
                    || !foundColumn.constraintTypes.includes(constraintType)
                  ) {
                    // Property does not exist.
                    if (foundColumn.constraintTypes === undefined) {
                      foundColumn.constraintTypes = [];
                    }
                    foundColumn.constraintTypes.push(constraintType);
                    // Add color scheme.
                    diffDbColors[`${table.name}-${column.name}-constraintType-${constraintType}`
                    ] = addColor;
                    backgroundColors[`${table.name}-${column.name}-constraintType-${constraintType}`
                    ] = false;
                  }
                });
              }
            }
          });
        }
      });

      // Check for deletions.
      diffDb.forEach((table) => {
        const foundTable = _.find(devDb, { name: table.name });

        if (foundTable === undefined) {
          // Table does not exist.
          // Add color scheme.
          diffDbColors[`${table.name}`] = deleteColor;
          backgroundColors[`${table.name}`] = false;
        } else {
          // Table exists.
          // Check columns.
          table.columns.forEach((column) => {
            const foundColumn = _.find(foundTable.columns, {
              name: column.name,
            });

            if (foundColumn === undefined) {
              // Column does not exist.
              // Add color scheme.
              diffDbColors[`${table.name}-${column.name}`] = deleteColor;
              backgroundColors[`${table.name}-${column.name}`] = false;
            } else {
              // Column exists.
              // Check column properties.
              // Do not have to check if data type exists because all columns must have a data type.

              // Check not null constraint.
              if (
                column.isNullable === false
                && column.isNullable !== foundColumn.isNullable
              ) {
                // Property has been modified.

                // Ge commented out below 1 line to test
                // foundColumn.isNullable = column.isNullable;

                // Add color scheme.
                diffDbColors[`${table.name}-${column.name}-nullable-${column.isNullable}`] = deleteColor;
                backgroundColors[`${table.name}-${column.name}-nullable-${column.isNullable}`] = false;
              }

              // Check constraint types.
              if (column.constraintTypes !== undefined) {
                column.constraintTypes.forEach((constraintType) => {
                  if (foundColumn.constraintTypes === undefined || !foundColumn.constraintTypes.includes(constraintType)) {
                    // Property does not exist.
                    // Add color scheme.
                    diffDbColors[`${table.name}-${column.name}-constraintType-${constraintType}`] = deleteColor;
                    backgroundColors[`${table.name}-${column.name}-constraintType-${constraintType}`
                    ] = false;
                  }
                });
              }
            }
          });
        }
      });

      this.setState({ diffDbColors, backgroundColors });
      return diffDb;
    };
  /* eslint-enable */

  setBackgroundColor(id) {
    const { backgroundColors } = this.state;
    const backgroundColorsCopy = JSON.parse(JSON.stringify(backgroundColors));
    backgroundColorsCopy[id] = !backgroundColorsCopy[id];
    this.setState({ backgroundColors: backgroundColorsCopy });
  }

  /**
   * Set display of all components but selected to false
   * @param {string} display - the id of the component to display
   */
  changeDisplay(display) {
    // const display = event.target.id;
    // Reset all displays to false to clear previous selected tab
    this.setState({
      devDbDisplay: false,
      prodDbDisplay: false,
      diffDbDisplay: false,
      // scriptDisplay: false,
      saveLoadDisplay: false,
    });

    // whichever tab was clicked gets set to true
    this.setState({ [display]: true });
  }

  /**
   * Function to add SQL command scripts to script window
   * Waits 500ms to give window time to open before scripts are sent
   * @param {string} id - id of the element to be changed
   * @param {string} query - update SQL command script
   */
  addScript(id, query) {
    const { script } = this.state;
    const scriptCopy = script.slice();

    scriptCopy.push({ id, query });

    main.createScriptWindow();
    setTimeout(() => ipcRenderer.send('updateScript', scriptCopy), 500);
    this.setState({ script: scriptCopy });
  }

  // removing from pop-up script window
  removeScript(id) {
    const { script } = this.state;
    const scriptCopy = script.filter(query => query.id !== id);
    console.log('remove', id, script, 'and', scriptCopy);
    main.createScriptWindow();
    setTimeout(() => ipcRenderer.send('updateScript', scriptCopy), 500);
    this.setState({ script: scriptCopy });
  }

  // removing all from script window AND de-selects all.
  removeAllChanges() {
    const backgroundColors = this.state;
    const backgroundColorsCopy = JSON.parse(JSON.stringify(backgroundColors));
    const ids = Object.keys(backgroundColorsCopy);

    ids.forEach((id) => {
      backgroundColorsCopy[id] = false;
    });

    ipcRenderer.send('updateScript', []);
    this.setState({ script: [], backgroundColors: backgroundColorsCopy });
  }

  // selects all and adds all scripts to window
  addAllChanges(script) {
    const { diffDbColors } = this.state;
    const backgroundColorsCopy = JSON.parse(JSON.stringify(diffDbColors));
    const ids = Object.keys(backgroundColorsCopy);

    ids.forEach((id) => {
      backgroundColorsCopy[id] = true;
    });

    ipcRenderer.send('updateScript', script);
    this.setState({ script, backgroundColors: backgroundColorsCopy });
  }

  openScriptWindow() {
    const { script } = this.state;

    main.createScriptWindow();
    setTimeout(() => ipcRenderer.send('updateScript', script), 500);
  }

  /**
   * Draw lines for foreign key relationships.
   */
  /* eslint-disable */
  drawLines() {
    // let queued = false;
    // return () => {
      const svgContainers = document.getElementsByClassName('svg-container');
      // console.log(svgContainers);
      for (let i = 0; i < svgContainers.length; i += 1) {
        svgContainers[i].style.display = 'none';
        svgContainers[i].parentNode.removeChild(svgContainers[i]);
      }
    if (!this.queued) {
      this.queued = true;
      // console.log(this.queued);
      const colors = ['navy', 'blue', 'aqua', 'teal', 'olive', 'green', 'lime', 'yellow', 'orange', 'red', 'maroon', 'fuscia', 'purples'];
      let colorIndex = 0;

      const rand1 = [-2, 5, -7, 10, 6, -5, 2, -1, 8, 4, -8, 0, -4, 1, 4, -10, 9, -3, -6, 7, 3, -9];
      const rand2 = [13, 16, 7, 12, 9, 4, 6, 5, 8, 14, 10];
      let ran1i = 0;
      let ran2i = 0;

      d3.selectAll('svg').remove();

      // const timer = setTimeout(() => {
      setTimeout(() => {
        const domElement = document.getElementsByClassName('list-group-item');
        // console.log('from drawLines', domElement);
        for (let i = 0; i < domElement.length; i += 1) {
          if (domElement[i].textContent.includes('REFERENCES')) {
            const tt = domElement[i].textContent.split(' ');

            for (let j = 0; j < domElement.length; j += 1) {

              if (domElement[j].textContent.includes(tt[tt.indexOf('REFERENCES') + 1]) && (!domElement[j].textContent.includes('REFERENCES')) && (domElement[j].parentNode.childNodes[0].textContent === (tt[tt.indexOf('REFERENCES') + 3]))) {
              // The data for our line
                let lineData = [];
                if (domElement[i].parentNode.parentNode.getBoundingClientRect().y < domElement[j].parentNode.parentNode.getBoundingClientRect().y) {
                  lineData = [
                    { x: domElement[i].getBoundingClientRect().x, y: domElement[i].getBoundingClientRect().y + rand2[ran2i % (rand2.length)] },
                    { x: domElement[i].parentNode.parentNode.getBoundingClientRect().x + rand1[ran1i % (rand1.length)], y: domElement[i].getBoundingClientRect().y + rand2[ran2i % (rand2.length)] },
                    { x: domElement[i].parentNode.parentNode.getBoundingClientRect().x + rand1[ran1i % (rand1.length)], y: domElement[i].parentNode.parentNode.getBoundingClientRect().bottom + rand2[ran2i % (rand2.length)] },
                    { x: domElement[j].parentNode.parentNode.getBoundingClientRect().x + rand1[ran1i % (rand1.length)], y: domElement[i].parentNode.parentNode.getBoundingClientRect().bottom + rand2[ran2i % (rand2.length)] },
                    { x: domElement[j].parentNode.parentNode.getBoundingClientRect().x + rand1[ran1i % (rand1.length)], y: domElement[j].getBoundingClientRect().y + rand2[ran2i % (rand2.length)] },
                    { x: domElement[j].getBoundingClientRect().x, y: domElement[j].getBoundingClientRect().y + rand2[ran2i % (rand2.length)] }];
                  ran2i++;
                  ran1i++;
                }
                else{

                  lineData = [
                    { x: domElement[i].getBoundingClientRect().x, y: domElement[i].getBoundingClientRect().y + rand2[ran2i % (rand2.length)] },
                    { x: domElement[i].parentNode.parentNode.getBoundingClientRect().x + rand1[ran1i % (rand1.length)], y: domElement[i].getBoundingClientRect().y + rand2[ran2i % (rand2.length)] },
                    { x: domElement[i].parentNode.parentNode.getBoundingClientRect().x + rand1[ran1i % (rand1.length)], y: domElement[i].parentNode.parentNode.getBoundingClientRect().y + rand2[ran2i % (rand2.length)] },
                    { x: domElement[j].parentNode.parentNode.getBoundingClientRect().x + rand1[ran1i % (rand1.length)], y: domElement[i].parentNode.parentNode.getBoundingClientRect().y + rand2[ran2i % (rand2.length)] },
                    { x: domElement[j].parentNode.parentNode.getBoundingClientRect().x + rand1[ran1i % (rand1.length)], y: domElement[j].getBoundingClientRect().y + rand2[ran2i % (rand2.length)] },
                    { x: domElement[j].getBoundingClientRect().x, y: domElement[j].getBoundingClientRect().y + rand2[ran2i % (rand2.length)] }];
                  ran2i++;
                  ran1i++;
                }


            
                // This is the accessor function we talked about above
                const lineFunction = d3.line()
                  .x(d => d.x)
                  .y(d => d.y);
                // .curve(d3.curveBasis);

                const bodyCanvas = document.getElementById('dbDisplayContainer');
                const svgContainer = d3.select(bodyCanvas)
                // .attr("transform", "translate(100,50)")
                  .append('div')
                  .classed('svg-container', true)
                  .append('svg')
                  .attr('width', '100%')
                  .attr('height', '100%')
                // .attr('preserveAspectRatio', 'xMinYMin meet')
                // .attr("viewBox", "0 0 600 400")
                  .classed('svg-content-responsive', true);

                // The line SVG Path we draw
                let path = svgContainer.append('path')
                  // .attr("marker-end", "url(#triangle)")
                  .attr('d', lineFunction(lineData))
                  .attr('stroke', colors[colorIndex++ % (colors.length)])
                  .attr('stroke-width', 1.5)
                  .attr('fill', 'none');
                  
                  var totalLength = path.node().getTotalLength();

                  // animate the line
                  path
                    .attr("stroke-dasharray", totalLength + " " + totalLength)
                    .attr("stroke-dashoffset", totalLength)
                    .transition()
                      .duration(1500)
                      // .ease(d3.easeLinear)
                      // .ease(d3.easeBounce) 
                      .attr("stroke-dashoffset", 0);
              }
            }
          }
        }

        this.queued = false;
      }, 1500);
    }
    // };
  }

  /**
   * Select / deselect change and add / remove query from script with event object.
   */
  handleSelect(event, diffDbColors, addScript, removeScript, setBackgroundColor, tableInfo, column) {
    event.stopPropagation();
    let id;
    let target;
    const { parentNode } = event.target;
    const grandmaNode = parentNode.parentNode;

    if (diffDbColors[event.target.id] !== undefined) {
      id = event.target.id;
      target = event.target;
    } else if (diffDbColors[parentNode.id] !== undefined) {
      id = parentNode.id;
      target = parentNode;
    } else if (diffDbColors[grandmaNode.id] !== undefined) {
      id = grandmaNode.id;
      target = grandmaNode;
    }
    if (diffDbColors[id] !== undefined) {
      // console.log(target.style.backgroundColor, diffDbColors[id]);
      if (target.style.backgroundColor === diffDbColors[id]) {
        // Background color is set meaning change is selected.
        // Deselect change and remove query from script.
        setBackgroundColor(id);
        removeScript(id);
      } else {
        // Select change.
        setBackgroundColor(id);

        // Create query.
        // Determine type of query from id.
        const queryParams = id.split('-');
        const { addColor, deleteColor, modifyColor } = this.state;

        // One query parameter means add or delete a table.
        if (queryParams.length === 1) {
          const { name, columns } = tableInfo;
          if (diffDbColors[id] === addColor) {
            // Add a table.
            let columnString = '';

            // Build columns part of query.
            columns.forEach((column) => {
              const {
                name, dataType, isNullable, constraintTypes,
              } = column;

              columnString += `"${name}" ${dataType}`;

              // Add NOT NULL constraint if it exists.
              if (!isNullable) {
                columnString += ' NOT NULL';
              }

              if (constraintTypes !== undefined) {
                // Loop through and add all constraint types.
                constraintTypes.forEach((constraintType) => {
                  if (constraintType.includes('REFERENCES')) {
                    const constraintTypeArray = constraintType.split(' ');
                    const foreignKey = ` ${constraintTypeArray[0]} ${constraintTypeArray[3]} (${constraintTypeArray[1]})`;
                    columnString += `${foreignKey}`;
                  } else {
                    columnString += ` ${constraintType}`;
                  }
                });
              }

              columnString += ', ';
            });

            // Remove last comma.
            columnString = columnString.slice(0, columnString.length - 2);

            // Add script to create a table.
            addScript(id, `CREATE TABLE ${name} (${columnString});`);
          } else if (diffDbColors[id] === deleteColor) {
            // Add script to delete a table.
            addScript(id, `DROP TABLE "${name}";\n/*  ALERT: THIS WILL ALSO CASCADE DELETE ALL ASSOCIATED DATA  */`);
          }
        }

        // Two query params means add or delete column from table
        if (queryParams.length === 2) {
          const {
            name, dataType, isNullable, constraintTypes,
          } = column;
          const tableName = tableInfo.name;
          let columnString = `ALTER TABLE "${tableName}" `;
          if (diffDbColors[id] === addColor) {
            // Add a column
            columnString += `ADD COLUMN "${name}" ${dataType}`;

            // Add NOT NULL constraint if it exists.
            if (!isNullable) {
              columnString += ' NOT NULL';
            }

            if (constraintTypes !== undefined) {
              // Loop through and add all constraint types.
              constraintTypes.forEach((constraintType) => {
                if (constraintType.includes('REFERENCES')) {
                  const constraintTypeArray = constraintType.split(' ');
                  const foreignKey = ` ${constraintTypeArray[0]} ${constraintTypeArray[3]} (${constraintTypeArray[1]})`;
                  columnString += `${foreignKey}`;
                } else {
                  columnString += ` ${constraintType}`;
                }
              });
            }

            columnString += ';';

            addScript(id, columnString);
          } else {
            // Must be deleteColor so delete a column
            addScript(id, `ALTER TABLE "${tableName}" DROP COLUMN "${name}";\n/*  ALERT: THIS WILL ALSO CASCADE DELETE ALL ASSOCIATED DATA  */`);
          }
        }

        // Four query params means add or delete data-type or constraint
        if (queryParams.length === 4) {
          const {
            name, dataType, constraintTypes, constraintNames,
          } = column;
          const tableName = tableInfo.name;

          // Add or remove a constraint.
          if (queryParams[2] === 'constraintType') {
            let columnString = `ALTER TABLE "${tableName}" `;

            if (diffDbColors[id] === addColor) {
              // add a constraint
              columnString += 'ADD';

              if (queryParams[3].includes('REFERENCES')) {
                const constraintTypeArray = queryParams[3].split(' ');
                const foreignKey = ` FOREIGN KEY (${queryParams[1]}) REFERENCES ${constraintTypeArray[3]} (${constraintTypeArray[1]})`;

                columnString += `${foreignKey}`;
              } else {
                columnString += ` ${queryParams[3]} ("${name}");`;
              }
              addScript(id, columnString);
            } else {
              // remove a constraint
              columnString += `DROP "${constraintNames[constraintTypes.indexOf(queryParams[3])]}";`;
              addScript(id, columnString);
            }
          }

          // Modify a data type.
          if (queryParams[2] === 'dataType') {
            // add a dataType
            addScript(id, `ALTER TABLE "${tableName}" ALTER COLUMN "${name}" TYPE ${dataType} USING "${name}"::${dataType};`);
          }

          // Add or remove NOT NULL constraint.
          if (queryParams[2] === 'nullable') {
            if (diffDbColors[id] === addColor) {
              // add a "NOT NULL"
              addScript(id, `ALTER TABLE "${tableName}" ALTER COLUMN "${name}" SET NOT NULL;`);
            } else {
              // remove a "NOT NULL"
              addScript(id, `ALTER TABLE "${tableName}" ALTER COLUMN "${name}" DROP NOT NULL;`);
            }
          }
        }
      }
    }
  }

  /**
   * Select / deselect change and add / remove query from script with id.
   */
  handleSelectWithId(id, diffDbColors, tableInfo, column) {
    // Select change.
    // Create query.
    const queryParams = id.split('-');
    const { addColor, deleteColor, modifyColor } = this.state;

    // One query parameter means add or delete a table.
    if (queryParams.length === 1) {
      const { name, columns } = tableInfo;
      if (diffDbColors[id] === addColor) {
        // Add a table.
        let columnString = '';

        // Build columns part of query.
        columns.forEach((column) => {
          const {
            name, dataType, isNullable, constraintTypes,
          } = column;

          columnString += `"${name}" ${dataType}`;

          // Add NOT NULL constraint if it exists.
          if (!isNullable) {
            columnString += ' NOT NULL';
          }

          if (constraintTypes !== undefined) {
            // Loop through and add all constraint types.
            constraintTypes.forEach((constraintType) => {
              if (constraintType.includes('REFERENCES')) {
                const constraintTypeArray = constraintType.split(' ');
                const foreignKey = ` ${constraintTypeArray[0]} ${constraintTypeArray[3]} (${constraintTypeArray[1]})`;
                columnString += `${foreignKey}`;
              } else {
                columnString += ` ${constraintType}`;
              }
            });
          }

          columnString += ', ';
        });

        // Remove last comma.
        columnString = columnString.slice(0, columnString.length - 2);

        // Add script to create a table.
        return `CREATE TABLE ${name} (${columnString});`;
      } if (diffDbColors[id] === deleteColor) {
        // Add script to delete a table.
        return `DROP TABLE "${name}";\n/*  ALERT: THIS WILL ALSO CASCADE DELETE ALL ASSOCIATED DATA  */`;
      }
    }

    // Two query params means add or delete column from table
    if (queryParams.length === 2) {
      const {
        name, dataType, isNullable, constraintTypes,
      } = column;
      const tableName = tableInfo.name;
      let columnString = `ALTER TABLE "${tableName}" `;
      if (diffDbColors[id] === addColor) {
        // Add a column
        columnString += `ADD COLUMN "${name}" ${dataType}`;

        // Add NOT NULL constraint if it exists.
        if (!isNullable) {
          columnString += ' NOT NULL';
        }

        if (constraintTypes !== undefined) {
          // Loop through and add all constraint types.
          constraintTypes.forEach((constraintType) => {
            if (constraintType.includes('REFERENCES')) {
              const constraintTypeArray = constraintType.split(' ');
              const foreignKey = ` ${constraintTypeArray[0]} ${constraintTypeArray[3]} (${constraintTypeArray[1]})`;
              columnString += `${foreignKey}`;
            } else {
              columnString += ` ${constraintType}`;
            }
          });
        }

        columnString += ';';

        return columnString;
      }
      // Must be deleteColor so delete a column
      return `ALTER TABLE "${tableName}" DROP COLUMN "${name}";\n/*  ALERT: THIS WILL ALSO CASCADE DELETE ALL ASSOCIATED DATA  */`;
    }

    // Four query params means add or delete data-type or constraint
    if (queryParams.length === 4) {
      const {
        name, dataType, constraintTypes, constraintNames,
      } = column;
      const tableName = tableInfo.name;

      // Add or remove a constraint.
      if (queryParams[2] === 'constraintType') {
        let columnString = `ALTER TABLE "${tableName}" `;

        if (diffDbColors[id] === addColor) {
          // add a constraint
          columnString += 'ADD';

          if (queryParams[3].includes('REFERENCES')) {
            const constraintTypeArray = queryParams[3].split(' ');
            const foreignKey = ` FOREIGN KEY (${queryParams[1]}) REFERENCES ${constraintTypeArray[3]} (${constraintTypeArray[1]})`;

            columnString += `${foreignKey}`;
          } else {
            columnString += ` ${queryParams[3]} ("${name}");`;
          }
          return columnString;
        }
        // remove a constraint
        columnString += `DROP "${constraintNames[constraintTypes.indexOf(queryParams[3])]}";`;
        return columnString;
      }

      // Modify a data type.
      if (queryParams[2] === 'dataType') {
        // add a dataType
        return `ALTER TABLE "${tableName}" ALTER COLUMN "${name}" TYPE ${dataType} USING "${name}"::${dataType};`;
      }

      // Add or remove NOT NULL constraint.
      if (queryParams[2] === 'nullable') {
        if (diffDbColors[id] === addColor) {
          // add a "NOT NULL"
          return `ALTER TABLE "${tableName}" ALTER COLUMN "${name}" SET NOT NULL;`;
        }
        // remove a "NOT NULL"
        return `ALTER TABLE "${tableName}" ALTER COLUMN "${name}" DROP NOT NULL;`;
      }
    }
  }

  selectAll(db, diffDbColors, addAllChanges) {
    const { handleSelectWithId } = this;
    const ids = Object.keys(diffDbColors);
    const script = [];

    // Loop through all ids of backgroundColors and select changes.
    ids.forEach((id) => {
      const idArray = id.split('-');
      const tableName = idArray[0];
      const foundTable = _.find(db, { name: tableName });

      if (idArray.length === 1) {
        script.push({ id, query: handleSelectWithId(id, diffDbColors, foundTable) });
      } else {
        const columnName = idArray[1];
        const foundColumn = _.find(foundTable.columns, { name: columnName });
        script.push({ id, query: handleSelectWithId(id, diffDbColors, foundTable, foundColumn) });
      }
    });

    addAllChanges(script);
  }
  /* eslint-enable */

  /**
   * Queries the database metadata to update the visuals.
   */
  refreshPage() {
    const { buildDbObjects } = this;
    const svgContainers = document.getElementsByClassName('svg-container');
    // console.log(svgContainers);
    for (let i = 0; i < svgContainers.length; i += 1) {
      svgContainers[i].style.display = 'none';
      svgContainers[i].parentNode.removeChild(svgContainers[i]);
    }
    this.setState({ showLoadingScreen: true });
    buildDbObjects();
  }

  render() {
    const {
      devDb,
      prodDb,
      diffDb,
      script,
      devDbDisplay,
      prodDbDisplay,
      diffDbDisplay,
      // scriptDisplay,
      // saveLoadDisplay,
      diffDbColors,
      backgroundColors,
      showLoadingScreen,
    } = this.state;

    const {
      changeDisplay,
      addScript,
      removeScript,
      setBackgroundColor,
      removeAllChanges,
      addAllChanges,
      openScriptWindow,
      drawLines,
      handleSelect,
      selectAll,
      refreshPage,
    } = this;

    /* eslint-disable */
    return (
      <div>
        <div id="loading-screen" style={{visibility: showLoadingScreen ? 'visible' : 'hidden'}}>
          <div id="loading-box">
          <h1 className="blinking" id="loading-message">Loading... </h1>
          
          {/* ge's loading balls */}
          <svg className="gooSvg">
              <defs>
                  <filter id="goo">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
                      <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
                      
                  </filter>
              </defs>
          </svg>
          
          <div class="gooContainer goo2">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
          </div>
          {/* ge's loading ball end */}
            
            <img src={loadingIcon} style={{width: '20px',height: '20px'}}/>
          </div>
        </div>
        <div className="mainContainerBtns">
        <Tooltip 
          title="Reset Application"
          TransitionComponent={Zoom}
        >
          <Button
            variant="outlined" color="primary"
            onClick={() => {
              main.closeScriptWindow();
              this.setState({ devDbConn: null, prodDbConn: null});
              return this.props.history.push("/");
            }}
          >
            Home
          </Button>
        </Tooltip>
          <Button
            style={{
              backgroundColor: devDbDisplay ? 'rgb(20, 84, 233)' : null,
              color: devDbDisplay ? 'rgba(255,255,255,0.85' : null,
            }}
            variant="outlined" color="primary"
            id="devDbDisplay"
            onClick={() => {
              changeDisplay('devDbDisplay');
            }}
          >
            Source DB
          </Button>
          <Button
          style={{
            backgroundColor: prodDbDisplay ? 'rgb(20, 84, 233)' : null,
            color: prodDbDisplay ? 'rgba(255,255,255,0.85' : null,
          }}
            variant="outlined" color="primary"
            id="prodDbDisplay"
            onClick={() => {
              changeDisplay('prodDbDisplay');
            }}
          >
            Target DB
          </Button>
          <Button
          style={{
            backgroundColor: diffDbDisplay ? 'rgb(20, 84, 233)' : null,
            color: diffDbDisplay ? 'rgba(255,255,255,0.85' : null,
          }}
            variant="outlined" color="primary"
            id="diffDbDisplay"
            onClick={() => {
              changeDisplay('diffDbDisplay');
            }}
          >
            DB Diff
          </Button>
          <div style={{'marginLeft': 'auto'}}>
            <Button
              variant="outlined" color="primary"
              id="scriptDisplay"
              onClick={openScriptWindow}
            >
              Script
            </Button>
            <Tooltip 
              title="Refresh"
              TransitionComponent={Zoom}
            >
              <Button
                variant="outlined" color="primary"
                id="scriptDisplay"
                onClick={refreshPage}
              >
                <i class="fas fa-sync-alt"></i>
              </Button>
            </Tooltip>
          </div>
          </div>
          {/* <Button
            variant="outlined" color="primary"
            id="saveLoadDisplay"
            onClick={() => {
              changeDisplay();
            }}
          >
            Save / Load
          </Button> */}
          {/* render page depending on which tab is selected (only one can be selected) */}
          {devDbDisplay ? <DbDisplayContainer db={devDb} drawLines={drawLines}/> : null}
          {prodDbDisplay ? <DbDisplayContainer db={prodDb} drawLines={drawLines} /> : null}
          {diffDbDisplay
            ? (
              <DiffDbDisplayContainer
                db={diffDb}
                diffDbColors={diffDbColors}
                addScript={addScript}
                removeScript={removeScript}
                script={script}
                backgroundColors={backgroundColors}
                setBackgroundColor={setBackgroundColor}
                removeAllChanges={removeAllChanges}
                addAllChanges={addAllChanges}
                drawLines={drawLines}
                handleSelect={handleSelect}
                selectAll={selectAll}
              />
            )
            : null}
          {/* {scriptDisplay ? <ScriptContainer script={script} /> : null} */}
          {/* {saveLoadDisplay ? <SaveLoadDisplay testData={this.state}/> : null} */}
      </div>
    );
    /* eslint-enable */
  }
}


// export default withRouter(MainContainer);
export default compose(
  withRouter,
  withStyles(),
)(MainContainer);
