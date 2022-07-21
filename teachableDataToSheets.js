/**
 * Get Teachable API Key
 */
const TEACHABLE_API_KEY = ScriptProperties.getProperty('teachableKey');

/**
 * add custom menu to run teachable functions
 */
function onOpen() {

  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Teachable Data')
    .addItem('Get course data', 'courseData')
    .addToUi();

}

/**
 * paste to Sheet
 */
function pasteToSheet(data) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Sheet1');

  // paste in data
  sheet.getRange(2,1,data.length,data[0].length).setValues(data);

  // set formats: number, number, %, number, %
  sheet.getRange(2,5,data.length,2).setNumberFormat('#,##0');
  sheet.getRange(2,7,data.length,1).setNumberFormat('0.0%');
  sheet.getRange(2,8,data.length,1).setNumberFormat('#,##0');
  sheet.getRange(2,9,data.length,1).setNumberFormat('0.0%');

}

/**
 * get course data for Sheet
 */
function courseData() {

  // get course list
  const courses = getCourseList();

  // add enrollment and completion data
  courses.forEach(course => {

    const courseID = course[0];

    let enrollmentData = '';
    try {
      enrollmentData = getCourseEnrollmentData(courseID);
      //console.log("Got data!");
      //console.log(enrollmentData);
    }
    catch (err) {
      console.log(err);
      enrollmentData = ["N/a","N/a","N/a","N/a","N/a"];
      //console.log("did not get data :(");
      //console.log(enrollmentData);
    }
    
    // add enrollment data for this course to the original array
    course.push(...enrollmentData);
   
  });

  pasteToSheet(courses); 

}

/**
 * get list of courses
 */
function getCourseList() {

  // set endpoint
  const endpoint = 'courses';

  // call teachable API
  let data = callTeachableApi(endpoint, 1);

  // get total number of pages
  const totalPages = data.meta.number_of_pages;

  // get first page course data
  let courseData = data.courses;
  //console.log(courseData.length);

  // get subsequent pages course data
  while (data.meta.page < totalPages) {

    const nextPage = data.meta.page + 1;
    data = callTeachableApi(endpoint, nextPage);
    courseData.push(...data.courses); // use spread operator to pass all the elements of the second array as arguments

  }

  // create empty array to hold course data
  const courseArray = [];

  // turn course array of objects into array of arrays for Sheets
  courseData.forEach(course => {
    const id = course.id;
    const name = course.name;
    const heading = course.heading;
    const isPublishd = course.is_published;
    const imageUrl = course.image_url;

    courseArray.push([
      id,
      `=IMAGE("${imageUrl}")`,
      name,
      isPublishd
    ]);

  })

  //console.log(courseArray);
  return courseArray;

}

/**
 * get course enrollment and completion data for specific course
 */
function getCourseEnrollmentData(courseID) {

  // set endpoint
  const endpoint = `courses/${courseID}/enrollments`;
  console.log(endpoint);

  // call teachable API
  const data = callTeachableApi(endpoint, 1);
  console.log(data.meta);

  // get total number of pages
  const totalPages = data.meta.number_of_pages;
  //console.log(totalPages);

  // initialize array to hold completion scores
  const completionMetrics = [];

  // add first batch of data to array
  const enrollments = data.enrollments;
  enrollments.forEach(user => {
    completionMetrics.push(user.percent_complete);
  })

  // call remaining pages
  for (let i = 2; i < totalPages; i++) {

    // call teachable API
    const data = callTeachableApi(endpoint, i)

    // parse data to get completion metrics
    const enrollments = data.enrollments;
    enrollments.forEach(user => {
      completionMetrics.push(user.percent_complete);
    })

  }

  // enrollments
  const numEnrollments = completionMetrics.length;

  // calculate number who have started
  const numberStarted = completionMetrics.filter(x => x > 0).length;

  // calculate started rate
  const percentStarted = numberStarted / numEnrollments;

  // find number completed
  const numberCompleted = completionMetrics.filter(x => x === 100).length;

  // calculate percent complete
  const percentCompleted = numberCompleted / numEnrollments;
  
  /* // calculate average
  const averageScore = completionMetrics.reduce((a,b) => a + b) / numEnrollments; */

  return [
    numEnrollments, 
    numberStarted, 
    `=IFERROR(${percentStarted},"N/a")`, 
    numberCompleted, 
    `=IFERROR(${percentCompleted},"N/a")`
  ];

}

/**
 * generic call to teachable API
 */
function callTeachableApi(endpoint, pageNum) {

  // teachable endpoint
  const url = 'https://developers.teachable.com/v1/' + endpoint;

  // current page number
  const page = '?page=' + pageNum;

  // fetch data for last 30 days only
  const today = new Date();
  const priorDate = new Date(new Date().setDate(today.getDate() - 30));
  console.log(priorDate);
  console.log(priorDate.toISOString());
  const afterDate = '&enrolled_in_after=' + priorDate.toISOString();

  /* // set max number of results per page
  const perPage = 'per=20'; */

  // set parameters for call
  const params = {
    headers: {
      Accept: 'application/json',
      apiKey: TEACHABLE_API_KEY
    },
    muteHttpExceptions: true
  }

  // call API
  const response = UrlFetchApp.fetch(url+page+afterDate, params);

  // parse returned data
  const jsonData = JSON.parse(response);

  // return data
  return jsonData;
}

/** 
 * helper function
 * Source: https://bobbyhadz.com/blog/javascript-format-number-as-percent
 */
function formatAsPercent(num) {
  return `${parseFloat(num).toFixed(1)}%`;
}
