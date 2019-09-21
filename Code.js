function isAdminUser(){
  return true;
}
function getAuthType() {
  var response = { type: 'NONE' };
  return response;
}
function getConfig(request) {
  var cc = DataStudioApp.createCommunityConnector();
  var config = cc.getConfig();
  Logger.log('start getconfig');
  console.log('starting getconfig');
  try {
    config.newInfo()
      .setId('instructions')
      .setText('Type the node name, the system and the market: real or in advance:');
    
    config.newTextInput()
      .setId('nodeName')
      .setName('Type the name of the node (substation). Full list here http://www.cenace.gob.mx/Paginas/Publicas/MercadoOperacion/NodosP.aspx')
      .setHelpText('e.g. 03CON-115 or 01NAU-85')
      .setPlaceholder('03CON-115');
    
    config.newTextInput()
      .setId('sysName')
      .setName('Type the system')
      .setHelpText('p.ej. SIN, BCA or BCS')
      .setPlaceholder('SIN');
    
    config.newTextInput()
      .setId('market')
      .setName('Market: Day Real Time (MTR) or Day in Advance (MDA)')
      .setHelpText('Only MTR or MDA')
      .setPlaceholder('MDA');
    
    config.setDateRangeRequired(true);
    
  } catch (e) {
      DataStudioApp.createCommunityConnector()
      .newUserError()
      .setDebugText('Error fetching data from getConfig. Exception details: ' + e)
      //.setText('Error fetching data from getConfig. Exception details: ' + e)
      .throwException();   
  }
  return config.build();
}

function getFields(request) {
  var cc = DataStudioApp.createCommunityConnector();
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;
  Logger.log('start getFields');
  console.log('starting getFields');
  try {
    fields.newDimension()
      .setId('nodeName')
      .setType(types.TEXT);
  
    fields.newMetric()
      .setId('pml')
      .setType(types.CURRENCY_MXN)
      //.setAggregation(aggregations.AVG);
  
    fields.newDimension()
      .setId('fecha')
      .setType(types.YEAR_MONTH_DAY);
  
  } catch (e) {
      DataStudioApp.createCommunityConnector()
      .newUserError()
      .setDebugText('Error fetching data from getFields. Exception details: ' + e)
      //.setText('Error fetching data from getFields. Exception details: ' + e)
      .throwException();   
  }
  return fields;
}

function getSchema(request) {
  try {
    var fields = getFields(request).build();
    Logger.log('start getSchema');
    console.log('starting getSchema');
  } catch (e) {
      DataStudioApp.createCommunityConnector()
      .newUserError()
      .setDebugText('Error fetching data from getSchema. Exception details: ' + e)
      //.setText('Error fetching data from getSchema. Exception details: ' + e)
      .throwException();   
  }
  return { schema: fields };
}


//getdata
function responseToRows(requestedFields, response, nodeName) {
  // Transform parsed data and filter for requested fields
  
  return response.map(function(dailyDownload) {
    var row = [];
    
    requestedFields.asArray().forEach(function (field) {
      
      console.log(row);
               //console.log(field.getId());
      switch (field.getId()) {
        case 'fecha':
          return row.push(dailyDownload.fecha.replace(/-/g, ''));
        case 'pml':
          return row.push(dailyDownload.pml);
      }
      });
    return { values: row };   
    
  });

}

function getData(request) {
  //request.configParams = validateConfig(request.configParams);

  //var requestedFields = getFields().forIds(
  //  request.fields.map(function(field) {
  //    return field.name;
  //  })
  //);
  Logger.log('start getData');
  console.log('starting getData');
  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });
  var requestedFields = getFields().forIds(requestedFieldIds);
  
  try {  
    // Fetch and parse data from API
    var stringURL = 'https://ws01.cenace.gob.mx:8082/SWPML/SIM/' +
      request.configParams.sysName +
        '/' +
          request.configParams.market +
            '/' +
              request.configParams.nodeName +
                '/' +
                  request.dateRange.startDate.split('-').join('/') +
                    '/' +
                      request.dateRange.endDate.split('-').join('/') +
                        '/JSON';
    stringURL = stringURL.split(',').join('')
    var url = [stringURL];
    
    var response = UrlFetchApp.fetch(url.join(''));
    var parsedResponse = JSON.parse(response).Resultados[0].Valores;
    //console.log(parsedResponse);
    var rows = responseToRows(requestedFields, parsedResponse, request.configParams.nodeName);
    console.log("rows");
    console.log(rows);
    //var x = x/0;
  } catch (e) {
    DataStudioApp.createCommunityConnector()
    .newUserError()
    .setDebugText('Error fetching data from getData. Exception details: ' + e + ' URL:' + url)
    //.setText('Error fetching data from getData. Exception details: ' + e + ' URL: ' + url )
    .throwException();   
  }
  
  
  return {
    schema: requestedFields.build(),
    rows: rows
  };
}