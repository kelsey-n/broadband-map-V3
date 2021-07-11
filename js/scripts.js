var map = new mapboxgl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    bounds: [[-80.00125, 40.40703], [-71.64066, 45.08304]] // so initial queryRenderedFeatures will capture all tracts
});

// Add navigation control:
map.addControl(new mapboxgl.NavigationControl({
  showCompass: false
}));

// enable tooltips
$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})

// variables to hold and edit our color schemes
var sequential_colors = ['#8A8AFF','#5C5CFF','#2E2EFF','#0000FF','#0000A3']; //blue TRY VARYING SATURATION
var diverging_colors = ['#d7191c','#fdae61','#ffffbf','#a6d96a','#1a9641'] //red --> green

// 'column name in data': 'display value for frontend of visualization'
var colName_to_displayVal = {
  'Wired 25 (BN)': 'wired25_3_2020_bn',
  'Wired 100 (BN)': 'wired100_3_2020_bn',
  //'averagembps_bn': 'Average Speed (BN)',
  //'fastestaveragembps_bn': 'Fastest Average Speed (BN)',
  //'lowestpricedterrestrialbroadbandplan_bn': 'Lowest Priced Terrestrial Plan (BN)',
  'Broadband Usage (MS)': 'broadbandusage_ms',
  'Average Throughput (ML)': 'avg_meanthroughputmbps_ml',
  'Number of Speed Tests (ML)': 'speedtests_ml',
  'Download Speed (Ook)': 'avgwt_downloadspeed_ook',
  'Upload Speed (Ook)': 'avgwt_uploadspeed_ook',
  'Number of Speed Tests (Ook)': 'speedtests_ook',
  'Number of Internet Providers (FCC)': 'numproviders_fcc',
  'Average Fraction Coverage (FCC)': 'avg_fractioncoverage_fcc',
  'Download Speed (FCC)': 'avgwt_maxaddown_fcc',
  'Upload Speed (FCC)': 'avgwt_maxadup_fcc',
  'Broadband Score': 'dummy_score_for_testing'
}

// Populate the variable selection dropdowns on the frontend:
$.each(colName_to_displayVal, function(key, value) {
  $('.dropdown-menu').append(`
    <li><a class="dropdown-item" data-value=${value} href="#">${key}</a></li>
    `)
})

// Obj var to hold arrays of all property values
var featuresObj = {};
$.each(colName_to_displayVal, function(key, value) {
  featuresObj[`${value}`] = []
});

// After map loads, qRF to get properties for charts & percentile calcs
map.on('load', function() {
  var testarr = map.queryRenderedFeatures()
  //console.log(testarr)
  var tractset = new Set() //to capture unique tracts since qRF captures dupes
  testarr.forEach((el) => {
    if (!tractset.has(el.properties.censustract)) {
      for (const [key, value] of Object.entries(featuresObj)) {
        featuresObj[`${key}`].push(el.properties[`${key}`])
      };
      tractset.add(el.properties.censustract)
    };
  });
  //console.log(featuresObj); // TO BE REMOVED
});

// Function to determine when the sidenav is open and what it is populated with
function openNav() {
  // Set the width of the side navigation to be viewable at 250px and move the sidenav buttons over 250px:
  document.getElementById("sidenav-menu").style.width = "250px";
  document.getElementById("sidenav-buttons").style.left = "250px";
  // Depending on which sidenav button was clicked, populate the menu with the relevant text
  $('.sidenav-button').click(function() {
    $('.sidenav-button').removeClass('sidenav-button-active'); //remove styling from any previously selected button
    var button_id = $(this).attr('id') //pull out the id name of the clicked sidenav button
    var menu_text = $(`#${button_id}-text`).html(); //get the menu text and styling for the clicked button
    $(".sidenav-menu-text").html(menu_text); //populate the sidenav menu with the appropriate html
    // style the clicked button:
    $(`#${button_id}`).addClass('sidenav-button-active');
  });
}

// Function to close the side navigaion
// Set the width of the side navigation to 0 and the left margin of the page content to 0
function closeNav() {
  document.getElementById("sidenav-menu").style.width = "0";
  document.getElementById("sidenav-buttons").style.left = "0px";
  $('.sidenav-button').removeClass('sidenav-button-active');
}

// Function to calculate percentiles of data
function percentiles(arr) {
  arr.sort(d3.ascending);
  var len = arr.length;
  var per20 =  Math.floor(len*0.2) - 1;
  var per40 =  Math.floor(len*0.4) - 1;
  var per60 =  Math.floor(len*0.6) - 1;
  var per80 =  Math.floor(len*0.8) - 1;
  var percs = [arr[per20], arr[per40], arr[per60], arr[per80]];
  let unique = [...new Set(percs)];
  if (unique.length != 4) {
    percs.forEach(function (perc, i) {
      if (perc == percs[i+1]) {
        percs[i+1] += 0.001
      };
    });
  };
  return percs
}

// Function to draw histogram of selected variables
function createPlot(arr, percentiles, chartid) {
  // TO DO: check how mapbox stops works for edge vals!!!!
  [0,1,2,3,4].forEach((i) => {
    if (i == 0) {
      window[`x${i}`] = arr.filter(value => value < percentiles[i]);
      var name = `0 - ${percentiles[i]}`;
    } else if (i == 4) {
      window[`x${i}`] = arr.filter(value => value >= percentiles[i-1]);
      var name = `${percentiles[i-1]}+`;
    } else {
      window[`x${i}`] = arr.filter(value => value >= percentiles[i-1] && value < percentiles[i]);
      var name = `${percentiles[i-1]} - ${percentiles[i]}`
    }

    window[`trace${i}`] = { // change this var name to be the range
      x: window[`x${i}`],
      type: 'histogram',
      marker: {
        color: sequential_colors[i]
      },
      name: name
    }
  })

  var data = [trace0, trace1, trace2, trace3, trace4];

  var layout = {
    margin: {
      t: 30, //top margin
      l: 30, //left margin
      r: 0, //right margin
      b: 20 //bottom margin
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    barmode: 'stack',
    legend: {
      font: {
        size: 10
      },
      itemclick: 'toggleothers',
      xanchor: 'center',
      yanchor: 'top',
      x: 0.2,
      y: -0.2,
      orientation: 'v',
      traceorder: 'normal',
      tracegroupgap: 0
    }
  };

  var config = {
    'displayModeBar': false // hides tool bar.
  };

  Plotly.newPlot(chartid, data, layout, config);
};

// variables to hold the user's selection of variables to display:
var first_var = 'Broadband Score';
var firstarr = [];

// this function will update the variable selections on the first dropdown menu for variable selection:
$("#first-dropdown li a").click(function() {
  first_var = $(this).text();
  first_check = true;
  $(this).parents(".dropdown").find('.btn').html($(this).text() + ' <span class="caret"></span>');

  firstarr = featuresObj[`${colName_to_displayVal[first_var]}`];
  // var testpercentiles = percentiles(firstarr) // TO DELETE
  // // create histogram for first variable
  // createPlot(firstarr, testpercentiles)

  // show fill layer for first variable
  map.setLayoutProperty('scores_layer', 'visibility','none');
  map.setLayoutProperty('first_selected_layer', 'visibility','visible');

  var intervals = percentiles(firstarr);
  createPlot(firstarr, intervals, 'chart1');
  console.log(intervals);
  map.setPaintProperty('first_selected_layer', 'fill-color', [
    'step',
    ['get', colName_to_displayVal[first_var]],
    sequential_colors[0],
    intervals[0], sequential_colors[1],
    intervals[1], sequential_colors[2],
    intervals[2], sequential_colors[3],
    intervals[3], sequential_colors[4],
  ]);
});

// Function to add styling for hovered census tract
map.on('load', function() {

  // openNav(); //load welcome message on load

  // add an empty data source, which we will use to highlight the census tract that the user is hovering over
  map.addSource('highlight-tract-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });

  // add a layer for the hovered census tract
  map.addLayer({
    id: 'highlight-tract-layer',
    type: 'line',
    source: 'highlight-tract-source',
    paint: {
      'line-width': 5,
      'line-color': 'black',
      // 'fill-opacity': 1,
      // 'fill-outline-color': 'black'
    }
  });
  map.moveLayer('highlight-tract-layer', 'scores_layer')
})

const REQUEST_GET_MAX_URL_LENGTH = 2048;

addCartoLayer();

// Function to add layers based on CARTO tiles:
async function addCartoLayer() {
  const tileSourceURLs = await getTileSources();

  map.addLayer(
    {
      id: 'scores_layer',
      type: 'fill',
      source: {
        type: 'vector',
        tiles: tileSourceURLs
      },
      'source-layer': 'layer0',
      layout: {
        'visibility': 'visible'
      },
      paint: {
        'fill-color': [
          'step',
          ['get', 'dummy_score_for_testing'],
          diverging_colors[0],
          2, diverging_colors[1],
          3, diverging_colors[2],
          4, diverging_colors[3],
          5, diverging_colors[4],
        ],
        'fill-opacity': 1
      }
    }
  );

  map.addLayer(
    {
      id: 'first_selected_layer',
      type: 'fill',
      source: {
        type: 'vector',
        tiles: tileSourceURLs
      },
      'source-layer': 'layer0',
      layout: {
        'visibility': 'none'
      },
      paint: {
        'fill-color': [
          'step',
          ['get', colName_to_displayVal[first_var]],
          sequential_colors[0],
          25, sequential_colors[1],
          100, sequential_colors[2],
          200, sequential_colors[3],
          230, sequential_colors[4],
        ],
        'fill-opacity': 1,
        'fill-outline-color': 'black'
      }
    }
  );
}

// Function to get tiles from CARTO source
async function getTileSources() {
  const mapConfig = JSON.stringify({
    version: '1.3.1',
    buffersize: {mvt: 1},
    layers: [
      {
        type: 'mapnik',
        options: {
          sql: 'SELECT the_geom_webmercator, censustract, wired25_3_2020_bn, wired100_3_2020_bn, broadbandusage_ms, avg_meanthroughputmbps_ml, speedtests_ml, avgwt_downloadspeed_ook, avgwt_uploadspeed_ook, speedtests_ook, numproviders_fcc, avg_fractioncoverage_fcc, avgwt_maxaddown_fcc, avgwt_maxadup_fcc, dummy_score_for_testing FROM masterdataset_speedtestdata_dummyscores',
          vector_extent: 4096,
          bufferSize: 1,
          version: '1.3.1'
        }
      }
    ]
  });
  const url = `https://usignite-intern.carto.com/api/v1/map?apikey=93ca9b2ca98129188e337d41aee1e0faad970acd`;
  const getUrl = `${url}&config=${encodeURIComponent(mapConfig)}`;
  let request;

  if (getUrl.length < REQUEST_GET_MAX_URL_LENGTH) {
    request = new Request(getUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

  } else {
    request = new Request(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: mapConfig
    });
  }

  const response = await fetch(request);
  return (await response.json()).metadata.tilejson.vector.tiles
}

// Create a popup, but don't add it to the map yet. This will be the hover popup
var popup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false
});

map.on('load', function() {
  // Function to query rendered features for the census tract the user is hovering over, highlight that tract, then populate popup with that tract's info
  map.on('mousemove', function(e) {
    //query for the features under the mouse:
    var features = map.queryRenderedFeatures(e.point, {
        layers: ['scores_layer', 'first_selected_layer']
      });

    // Check whether features exist
    if (features.length > 0) {
      map.getCanvas().style.cursor = 'pointer'; //change cursor to pointer if hovering over a census tract

      var hoveredFeature = features[0];
      //Extract necessary variables:
      var tract_id = hoveredFeature.properties.censustract;
      // var county_name = INCLUDE COUNTY NAME HERE
      var first_var_value = hoveredFeature.properties[`${colName_to_displayVal[first_var]}`];

      window['popupContent'] = `
        <div style = "font-family:sans-serif; font-size:14px; font-weight:bold">Census Tract ${tract_id}</div>
        <div style = "font-family:sans-serif; font-size:14px; font-weight:bold">County</div>
        <div style = "font-family:sans-serif; font-size:11px; font-weight:600">${first_var}: ${first_var_value}</div>
      `;

      //fix the position of the popup as the position of the circle:
      popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(map);
      //create and populate a feature with the properties of the hoveredFeature necessary for data-driven styling of the highlight layer
      // var hoveredFeature_data = {
      //   'type': 'Feature',
      //   'geometry': hoveredFeature.geometry,
      //   'properties': {
      //     'avgwt_uploadspeed_ook': upload_sp,
      //     'avgwt_downloadspeed_ook': download_sp
      //   },
      // };
      // set this circle's geometry and properties as the data for the highlight source
      map.getSource('highlight-tract-source').setData(hoveredFeature.geometry);

      } else { //if len(features) <1
        // remove the Popup, change back to default cursor and clear data from the highlight data source
        popup.remove();
        map.getCanvas().style.cursor = '';
        map.getSource('highlight-tract-source').setData({
          'type': 'FeatureCollection',
          'features': []
        })
      }
  });
});
