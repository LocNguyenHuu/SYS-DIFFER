import React, { Component } from 'react';
import _ from 'lodash';
import { withRouter } from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import DbDisplayContainer from './DbDisplayContainer.jsx';
import DiffDbDisplayContainer from './DiffDbDisplayContainer.jsx';
import SaveLoadDisplay from '../components/SaveLoadDisplay.jsx';
import loadingIcon from '../../assets/5pSf.gif';


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

    this.state = {
      devDb: [],
      prodDb: [],
      diffDb: [],
      script: [],
      devDbDisplay: true,
      prodDbDisplay: false,
      diffDbDisplay: false,
      scriptDisplay: false,
      saveLoadMenu: false,
      backgroundColors: {},
      showLoadingScreen: true,
    };

    this.changeDisplay = this.changeDisplay.bind(this);
    this.addScript = this.addScript.bind(this);
    this.removeScript = this.removeScript.bind(this);
    this.setBackgroundColor = this.setBackgroundColor.bind(this);
    this.removeAllChanges = this.removeAllChanges.bind(this);
    this.addAllChanges = this.addAllChanges.bind(this);
    this.openScriptWindow = this.openScriptWindow.bind(this);
  }

  /**
   * Getting database URL from entry page (either entire URL at top, or by creating URL from inputs)
   */
  componentWillMount() {
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

    const query = `
      SELECT 
      table_name,
      column_name,
      is_nullable,
      data_type,
      character_maximum_length,
      string_agg(constraint_type, ', ') AS constraint_types,
      string_agg(foreign_table_name, ', ') AS foreign_table_name,
      string_agg(foreign_column_name, ', ') AS foreign_column_name,
      string_agg(constraint_name, ', ') AS constraint_names
      FROM
        (
          SELECT
          tc.constraint_name,
          t.table_name,
          c.column_name,
          c.is_nullable,
          c.data_type,
          c.character_maximum_length,
          tc.constraint_type,
          null AS foreign_table_name,
          null AS foreign_column_name
          FROM
          information_schema.tables AS t JOIN information_schema.columns AS c
            ON t.table_name = c.table_name
          LEFT JOIN information_schema.key_column_usage AS kcu
            ON t.table_name = kcu.table_name AND c.column_name = kcu.column_name
          LEFT JOIN information_schema.table_constraints AS tc
            ON kcu.constraint_name = tc.constraint_name
          LEFT JOIN information_schema.constraint_column_usage AS ccu 
            ON tc.constraint_name = ccu.constraint_name
          WHERE t.table_type = 'BASE TABLE'
          AND t.table_schema = '${inputLinkSchema1}'
          AND (tc.constraint_type is null OR tc.constraint_type <> 'FOREIGN KEY')
          UNION ALL
          SELECT
          tc.constraint_name,
          t.table_name,
          c.column_name,
          c.is_nullable,
          c.data_type,
          c.character_maximum_length,
          tc.constraint_type,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
          FROM
          information_schema.tables AS t JOIN information_schema.columns as c
            ON t.table_name = c.table_name
          LEFT JOIN information_schema.key_column_usage as kcu
            ON t.table_name = kcu.table_name AND c.column_name = kcu.column_name
          LEFT JOIN information_schema.table_constraints as tc
            ON kcu.constraint_name = tc.constraint_name
          LEFT JOIN information_schema.constraint_column_usage AS ccu
            ON tc.constraint_name = ccu.constraint_name
          WHERE t.table_type = 'BASE TABLE'
          AND t.table_schema = '${inputLinkSchema1}'
          AND tc.constraint_type = 'FOREIGN KEY'
        ) AS subquery
      GROUP BY table_name, column_name,  is_nullable, data_type, character_maximum_length
      ORDER BY table_name, column_name
      `;

    const query2 = `
        SELECT 
        table_name,
        column_name,
        is_nullable,
        data_type,
        character_maximum_length,
        string_agg(constraint_type, ', ') AS constraint_types,
        string_agg(foreign_table_name, ', ') AS foreign_table_name,
        string_agg(foreign_column_name, ', ') AS foreign_column_name,
        string_agg(constraint_name, ', ') AS constraint_names
        FROM
          (
            SELECT
            tc.constraint_name,
            t.table_name,
            c.column_name,
            c.is_nullable,
            c.data_type,
            c.character_maximum_length,
            tc.constraint_type,
            null AS foreign_table_name,
            null AS foreign_column_name
            FROM
            information_schema.tables AS t JOIN information_schema.columns AS c
              ON t.table_name = c.table_name
            LEFT JOIN information_schema.key_column_usage AS kcu
              ON t.table_name = kcu.table_name AND c.column_name = kcu.column_name
            LEFT JOIN information_schema.table_constraints AS tc
              ON kcu.constraint_name = tc.constraint_name
            LEFT JOIN information_schema.constraint_column_usage AS ccu 
              ON tc.constraint_name = ccu.constraint_name
            WHERE t.table_type = 'BASE TABLE'
            AND t.table_schema = '${inputLinkSchema2}'
            AND (tc.constraint_type is null OR tc.constraint_type <> 'FOREIGN KEY')
            UNION ALL
            SELECT
            tc.constraint_name,
            t.table_name,
            c.column_name,
            c.is_nullable,
            c.data_type,
            c.character_maximum_length,
            tc.constraint_type,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
            FROM
            information_schema.tables AS t JOIN information_schema.columns as c
              ON t.table_name = c.table_name
            LEFT JOIN information_schema.key_column_usage as kcu
              ON t.table_name = kcu.table_name AND c.column_name = kcu.column_name
            LEFT JOIN information_schema.table_constraints as tc
              ON kcu.constraint_name = tc.constraint_name
            LEFT JOIN information_schema.constraint_column_usage AS ccu
              ON tc.constraint_name = ccu.constraint_name
            WHERE t.table_type = 'BASE TABLE'
            AND t.table_schema = '${inputLinkSchema2}'
            AND tc.constraint_type = 'FOREIGN KEY'
          ) AS subquery
        GROUP BY table_name, column_name,  is_nullable, data_type, character_maximum_length
        ORDER BY table_name, column_name
        `;

    // connect to each database
    const devDbConn = pgp(input1);
    const prodDbConn = pgp(input2);


    /**
 * Parse schemaInfo to create table objects.
 * @param {string} dbName - name of the database (dev or prod)
 * @param {object} schemaInfo - the metadata about tables returned from database
 */

    const setDbInfo = (schemaInfo) => {
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
            // create Foreign Key statement
            if (constraintType === 'FOREIGN KEY') { constraintTypeTemp = `REFERENCES ${foreign_column_name} IN ${foreign_table_name}`; }

            // add another key in column obj? 
            
            column.constraintTypes.push(constraintTypeTemp);
            column.constraintNames.push(constraintNamesArray[index]);
          });
        }

        // Add new column object to table.
        if (table.columns === undefined) table.columns = [column];
        else table.columns.push(column);
      });

      // Push the last table.
      dbCopy.push(table);

      return dbCopy;
    };

    /**
     * Create diffDb by comparing table objects in database arrays.
     * @param {array} devDb
     * @param {array} prodDb
     */
    const diffDatabases = (devDb, prodDb) => {
      // make a deep copy of prodDb
      const diffDb = JSON.parse(JSON.stringify(prodDb));
      const diffDbColors = {};
      const backgroundColors = {};
      // Check for additions and modifications.
      devDb.forEach((table) => {
        const foundTable = _.find(diffDb, { name: table.name });

        if (foundTable === undefined) {
          // Table does not exist.
          diffDb.push(table);
          // Add color scheme.
          diffDbColors[`${table.name}`] = 'darkseagreen';
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
              diffDbColors[`${table.name}-${column.name}`] = 'darkseagreen';
              backgroundColors[`${table.name}-${column.name}`] = false;
            } else {
              // Column exists.
              // Check column properties.

              // Check data type.
              if (column.dataType !== foundColumn.dataType) {
                // Property has been modified.
                foundColumn.dataType = column.dataType;
                // Add color scheme.
                diffDbColors[
                  `${table.name}-${column.name}-dataType-${column.dataType}`
                ] = 'yellow';
                backgroundColors[
                  `${table.name}-${column.name}-dataType-${column.dataType}`
                ] = false;
              }

              // Check not null constraint.
              if (
                column.isNullable === false
                && column.isNullable !== foundColumn.isNullable
              ) {
                // Property has been modified.
                foundColumn.isNullable = column.isNullable;
                // Add color scheme.
                diffDbColors[
                  `${table.name}-${column.name}-nullable-${column.isNullable}`
                ] = 'darkseagreen';
                backgroundColors[
                  `${table.name}-${column.name}-nullable-${column.isNullable}`
                ] = false;
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
                    diffDbColors[
                      `${table.name}-${
                        column.name
                      }-constraintType-${constraintType}`
                    ] = 'darkseagreen';
                    backgroundColors[
                      `${table.name}-${
                        column.name
                      }-constraintType-${constraintType}`
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
          diffDbColors[`${table.name}`] = 'indianred';
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
              diffDbColors[`${table.name}-${column.name}`] = 'indianred';
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
                diffDbColors[
                  `${table.name}-${column.name}-nullable-${column.isNullable}`
                ] = 'indianred';
                backgroundColors[
                  `${table.name}-${column.name}-nullable-${column.isNullable}`
                ] = false;
              }

              // Check constraint types.
              if (column.constraintTypes !== undefined) {
                column.constraintTypes.forEach((constraintType) => {
                  if (
                    foundColumn.constraintTypes === undefined
                    || !foundColumn.constraintTypes.includes(constraintType)
                  ) {
                    // Property does not exist.
                    // Add color scheme.
                    diffDbColors[
                      `${table.name}-${
                        column.name
                      }-constraintType-${constraintType}`
                    ] = 'indianred';
                    backgroundColors[
                      `${table.name}-${
                        column.name
                      }-constraintType-${constraintType}`
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

    let devDb;
    let prodDb;
    let diffDb;

    // query dev database for schema info
    devDbConn.any(query2).then((schemaInfo) => {
      devDb = setDbInfo(schemaInfo);

      // query production database for schema info
      prodDbConn
        .any(query)
        .then((schemaInfo2) => {
          prodDb = setDbInfo(schemaInfo2);
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
          });
        });
    });
  }

  setBackgroundColor(id) {
    const { backgroundColors } = this.state;
    const backgroundColorsCopy = JSON.parse(JSON.stringify(backgroundColors));

    backgroundColorsCopy[id] = !backgroundColorsCopy[id];
    this.setState({ backgroundColors: backgroundColorsCopy });
  }

  changeDisplay(display) {
    // const display = event.target.id;
    // Reset all displays to false to clear previous selected tab
    this.setState({
      devDbDisplay: false,
      prodDbDisplay: false,
      diffDbDisplay: false,
      scriptDisplay: false,
      saveLoadDisplay: false,
    });
    // whichever tab was clicked gets set to true
    this.setState({ [display]: true });
  }

  /**
   * Function to add SQL command scripts to script window
   * @param {string} id - id of the element to be changed
   * @param {string} query - update SQL command script
   */
  addScript(id, query) {
    const { script } = this.state;
    const scriptCopy = script.slice();

    scriptCopy.push({ id, query });

    main.createScriptWindow();
    setTimeout(() => ipcRenderer.send('updateScript', scriptCopy), 200);
    this.setState({ script: scriptCopy });
  }

  // removing from pop-up script window
  removeScript(id) {
    const { script } = this.state;
    const scriptCopy = script.filter(query => query.id !== id);

    main.createScriptWindow();
    setTimeout(() => ipcRenderer.send('updateScript', scriptCopy), 200);
    ipcRenderer.send('updateScript', scriptCopy);
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
    main.createScriptWindow();
  }

  // ************************************  STOPPED COMMENTING HERE   ************************************

  render() {
    const {
      devDb,
      prodDb,
      diffDb,
      script,
      devDbDisplay,
      prodDbDisplay,
      diffDbDisplay,
      scriptDisplay,
      saveLoadDisplay,
      diffDbColors,
      backgroundColors,
      showLoadingScreen,
    } = this.state;
    const {
      changeDisplay, addScript, removeScript, setBackgroundColor, removeAllChanges, addAllChanges, openScriptWindow,
    } = this;

    /* eslint-disable */
    return (
      <div>
        <div id="loading-screen" style={{visibility: showLoadingScreen ? 'visible' : 'hidden'}}>
          <div id="loading-box">
            <h1 className="blinking" id="loading-message">Loading... </h1>
            <img src={loadingIcon} style={{width: '20px',height: '20px'}}/>
          </div>
        </div>
        <div className="mainContainerBtns">
          <Button
            variant="outlined" color="primary"
            onClick={event => {
              main.closeScriptWindow();
              return this.props.history.push("/");
            }}
          >
            Home
          </Button>
          <Button
            variant="outlined" color="primary"
            id="devDbDisplay"
            onClick={event => {
              changeDisplay('devDbDisplay');
            }}
          >
            Dev DB
          </Button>
          <Button
            variant="outlined" color="primary"
            id="prodDbDisplay"
            onClick={event => {
              changeDisplay('prodDbDisplay');
            }}
          >
            Prod DB
          </Button>
          <Button
            variant="outlined" color="primary"
            id="diffDbDisplay"
            onClick={event => {
              changeDisplay('diffDbDisplay');
            }}
          >
            DB Diff
          </Button>
          <Button
            variant="outlined" color="primary"
            id="scriptDisplay"
            onClick={openScriptWindow}
          >
            Script
          </Button>
          <Button
            variant="outlined" color="primary"
            id="saveLoadDisplay"
            onClick={event => {
              changeDisplay(event);
            }}
          >
            Save / Load
          </Button>
          {/* render page depending on which tab is selected (only one can be selected) */}
          {devDbDisplay ? <DbDisplayContainer db={devDb} /> : null}
          {prodDbDisplay ? <DbDisplayContainer db={prodDb} /> : null}
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
              />
            )
            : null}
          {/* {scriptDisplay ? <ScriptContainer script={script} /> : null} */}
          {saveLoadDisplay ? <SaveLoadDisplay testData={this.state}/> : null}
        </div>
      </div>
    );
    /* eslint-enable */
  }
}

export default withRouter(MainContainer);
