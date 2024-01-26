/*
    1. Generate the Tags
        -Open the Project in Titan
        -Preview any page
        -First code will generate a current set of all tags on the pages in the console
        -Save the generated json on the project as the variable "json_tagset"

    2. Use tags to generate dataset and send
        -Use inside JSON nodes in Titan
            -Dont forget to add a "wait" node after the json node in Titan
        -When dataset for the active page should be generated
        -Encryption for posting out
*/
//-------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------
// HSC Tagset Generation
// Preview any page on the project, run:

var v, tags;
var tagset={};

// It should work on the live version if you delete the ?ftnocache&device=lg
// But it's inconsistent
var pages = {"3":"https://kellerpostman.formtitan.com/ftproject/hsc_pfs/ftef4ea233e38740f5abad92545bd68ee5?ftnocache&device=lg",
            "4":"https://kellerpostman.formtitan.com/ftproject/hsc_pfs/ftf6e407f116ad4d94a1c903fb9ebbdd49?ftnocache&device=lg",
            "2":"https://kellerpostman.formtitan.com/ftproject/hsc_pfs/ft047c7e2cbc1f4633abd0e8ecd28e9af0?ftnocache&device=lg",
            "1":"https://kellerpostman.formtitan.com/ftproject/hsc_pfs/ft54dae613916d428dab323a6282b2353c?ftnocache&device=lg",
            "5":"https://kellerpostman.formtitan.com/ftproject/hsc_pfs/ftb941bef914be4abb8c326754a05bfb5b?ftnocache&device=lg"};

for (var p in pages){
    v = fetch(pages[p])
        .then(res=> res.text())
        .then(data=> {
        const appStateStr = data.match(/(?<=__FT__APP__STATE=)(.+?)(?=};<\/script>)/)[0] +"}";
        const appState = JSON.parse(appStateStr);
        if(!appState.pages) return;
        const elements = appState.pages[appState.currentPage]?.Props?.elements;

        if(!elements) return;
        const tags = Object.keys(elements)
        .filter(el => elements[el].type === "FormField")
        .map(el => elements[el]?.props?.tag )
        .filter(x=>x);
        return tags;
    });

    (async()=>{tagset[p] = (await v)})();
}

tagset = JSON.stringify(tagset);

//Save this string in the variable "json_tagset" on the Titan project. 
//-------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------




//-------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------

//Put the headers in for the package
//in the Titan -> Tools->Custom Styles
//Utitlity functions can go in Tools->Custom JavaScripts

//HTML Headers for CryptoJS
//<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/core.js"></script>
//<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/aes.js"></script>
//Random iv for AES256 encryption
//This function is necessary for Tray to be able to decrypt 
function gen_iv() {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&';
    for (var i=0; i<16; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

//CryptoJS utility function to encrypt and package up the data
function getCryptData(data, key_str){
    var b_key = CryptoJS.enc.Base64.parse(key_str);
    var iv = CryptoJS.enc.Base64.parse(btoa(gen_iv()));
    var crypt_data = JSON.stringify(data);
    var crypt = CryptoJS.AES.encrypt(crypt_data, b_key,
        {iv: iv,
        padding:CryptoJS.pad.Pkcs7,
        mode:CryptoJS.mode.CBC});

    var ct = crypt.ciphertext.toString(CryptoJS.enc.Base64);
    return {
        "iv":crypt.iv.toString(CryptoJS.enc.Base64),
        "data":ct
        };
}
//-------------------------------------------------------------------------------------------------------------


//Collect the data on the page, encrypt and package
//Get all data on page
var tagset = JSON.parse(ftGetParamValue("json_tagset"));
var page = ftGetParamValue("active_page");

var pagedata = tagset[page].reduce(function(acc,v){
    acc[v] = ftGetParamValue(v);
    return acc;
},{});

pagedata = Object.fromEntries(
    Object.entries(pagedata).map(([key, value]) => [key, value === undefined ? '' : value])
);


//encrypt and prep to send
var key_str = "tMhS+2IsiZmpZcDHW1lNZ6sXDrQamAmxFRazChW8YxM=";
var crypt = getCryptData(pagedata,key_str);

var sub = {"metadata":{"page":page,
                        "matter":ftGetParamValue("matter_id"),
                        "party":ftGetParamValue("party_id"),
                        },
            "data":crypt};


//sub = JSON.stringify(sub);
//Send sub wherever
//-------------------------------------------------------------------------------------------------------------


////Send to Tray Webhhok
// var root = "https://3f112ed9-c29c-4dad-b822-605ad0678af5.trayapp.io";
// var request = new XMLHttpRequest();
// request.open("POST", root);
// request.send(JSON.stringify(tagset));    

















