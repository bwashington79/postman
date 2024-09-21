const newman = require("newman"); // require newman in your project
const services = require("../../services");
const fs = require("fs");
const { async } = require("q");

let result = null;
let errorType = null;
let errorMessage = null;
let reportUrl = null;
let localFilePath = "./test/postman/results/test_results.html";
let postmanCollection = process.argv[2];

let collection = function() {
  return new Promise(async (resolve, reject) => {
    newman
      .run({
        //collection: require("./WF_API_V3.postman_collection.json"),
        collection: require("./" + postmanCollection),
        globals: require("./MyWorkspace.postman_globals.json"),
        environment: {
          id: "7dc05e57-7436-4182-a830-97ad814f83d0",
          name: "dev",
          values: [
            {
              key: "baseUrl",
              value: "https://apiv3-dev.trails-end.com",
              type: "default",
              enabled: true,
            },
          ],
          _postman_variable_scope: "environment",
          _postman_exported_at: "2023-01-23T02:20:28.960Z",
          _postman_exported_using: "Postman/10.6.0",
        },
        reporters: ["cli", "html"],
        reporter: {
          html: {
            export: "./test/postman/results/test_results.html",
          },
        },
        bail: true,
      })
      .on("start", function (err, args) {
        console.log("\n\nrunning Postman collection(s)...")})

      .on("assertion", (err, summary) => {
        if (err) {
          errorType = JSON.stringify(err.name);
          errorMessage = JSON.stringify(err.message);
        } 
      })
      .on("done", async (err, summary) => {

        // throw new Error("Something went wrong");

        result = await saveFile("newman_report");

        if (result) {

          console.log(
            "\n\nurl to newman report... " + JSON.stringify(result.Data.cdnPath)
          );

          reportUrl = JSON.stringify(result.Data.cdnPath);
        }

        if (err || summary.error) {
          reject(err || summary.error);
        } else {
          resolve(summary);
        }
      });
  });
};
let saveFile = async (fileName) => {
  return new Promise(async (resolve, reject) => {
    let upload = new services.s3.UploadFile(localFilePath, fileName, "html", "api-test-results");
    let uploadResult = await upload
      .uploadFile()
      .catch((err) => resolve({ Errored: true, Data: err }));
    resolve(uploadResult);
  });
};

exports.runApiTest = async () => {

  await collection();


// - Uncomment to aid in debugging -

// console.log('Error type is ' + errorType);
// console.log('Error Message is ' + errorMessage);
// console.log('Url is ' + reportUrl);


  let urlReplace = reportUrl;
  // console.log("value of urlReplace is ", urlReplace);
  let teamsMsg = "Error type is " + errorType + "\n\n" + "Click link below to view results \n\n" + "[Report link](" + urlReplace.replace(/"|'/g, "") + ")";
  let testMessage = new services.teams.AutomatedTest("API test(s) FAILED!",teamsMsg);

  if (errorType) {
    await testMessage.send()
    process.exit(1);
  }
};
