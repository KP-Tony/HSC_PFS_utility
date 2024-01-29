/*
    1. Generate the Tags
        -Open the Project in Titan
        -Preview any page
        -First code will generate a current dataset template of all tags on the pages in the console
        -Save the generated json on the project as the variable "json_fieldset"

    2. Use tags to generate dataset and send
        -Use inside JSON nodes in Titan
            -Dont forget to add a "wait" node after the json node in Titan
        -When dataset for the active page should be generated
        -Encryption for posting out
*/

//-------------------------------------------------------------------------------------------------------------
//--------------------------------------------------Generating Tags--------------------------------------------------
//-------------------------------------------------------------------------------------------------------------
// HSC Tagset Generation
// Preview any page on the project, run:

// NEW Fieldset generator to handle repeat container structure
// Transform the elements object into new fieldset JSON structure
function genFieldSet(filteredElements) {
    const transformedObject = {};
    for (const [elKey, elValue] of Object.entries(filteredElements)) {

        transformedObject[elValue.props.tag] = {
        type: elValue.type,
        el: elKey,
        value: elValue.props.lg.value || '',
        label: elValue.props.lg.label || '',
        styleRef: elValue.props.styleRef,
        };
    }
    return transformedObject;
}

var fieldset = {};
var pages = {"3":"https://kellerpostman.formtitan.com/ftproject/hsc_pfs/ftef4ea233e38740f5abad92545bd68ee5?ftnocache&device=lg",
            "4":"https://kellerpostman.formtitan.com/ftproject/hsc_pfs/ftf6e407f116ad4d94a1c903fb9ebbdd49?ftnocache&device=lg",
            "2":"https://kellerpostman.formtitan.com/ftproject/hsc_pfs/ft047c7e2cbc1f4633abd0e8ecd28e9af0?ftnocache&device=lg",
            "1":"https://kellerpostman.formtitan.com/ftproject/hsc_pfs/ft54dae613916d428dab323a6282b2353c?ftnocache&device=lg",
            "5":"https://kellerpostman.formtitan.com/ftproject/hsc_pfs/ftb941bef914be4abb8c326754a05bfb5b?ftnocache&device=lg"};

for (var p in pages){

    var v = fetch([pages[p]])
        .then(res=> res.text())
        .then(data=> {
        const appStateStr = data.match(/(?<=__FT__APP__STATE=)(.+?)(?=};<\/script>)/)[0] +"}";
        const appState = JSON.parse(appStateStr);
        if(!appState.pages) return;
        const elements = appState.pages[appState.currentPage]?.Props?.elements;

        const elementEntries = Object.entries(elements);
        const filteredElements = elementEntries.reduce((acc, [key, value]) => {
        if (value.type === 'FormField' || value.type === 'RepeatAutoFit') {
            acc[key] = value;
        }
        return acc;
        }, {});
    
        var fields = genFieldSet(filteredElements);
        return fields;
    });

    (async()=>{fieldset[p] = (await v)})()
}
//save this string on the project
console.log(fieldset);

//Save this string in the variable "json_fieldset" on the Titan project. 
//-------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------



//-------------------------------------------------------------------------------------------------------------
//--------------------------------------------------Data Handling--------------------------------------------------
//-------------------------------------------------------------------------------------------------------------
//Use data on page to populate fieldset

function findTagByEL(elements, idx, page) {
    for (const [key, value] of Object.entries(elements[page])) {
        if (value['el']==idx){
            return key;
        }
    }
    return null;
}

function getPageValues(fieldset, page){
    var fields, t;
    //Have to do the repeat fields first
    //They do not work the same way
    for (const [key, value] of Object.entries(fieldset[page])){
        if (value['type']=='RepeatAutoFit'){
            fields = ftGetValueByID(ftGetCurrentPage(),value['el']);
            for (const [k,v] of Object.entries(fields)){
                t = findTagByEL(fieldset,k,page) ?? null;
                if (t!=null && fieldset[page].hasOwnProperty(t)){
                    fieldset[page][t]['value']=v;
                    //Give these fields new type, otherwise they are overwriten with ''
                    fieldset[page][t]['type']='RepField';
                }
            }
        }
    }

    for (const [key, value] of Object.entries(fieldset[page])) {
        if (value['type']=='FormField'){
            t = ftGetValueByID(ftGetCurrentPage(), value['el']);
            fieldset[page][key]['value'] = t; 
        }
    }
    return fields;
}

//Vital that this variable is updated for every page on the project
var page = ftGetParamValue("active_page");
// var fieldset = ftGetParamValue("json_fieldset");
// fieldset = JSON.parse(fieldset);
var fields = getPageValues(fieldset, page);
//resave the updated fieldset
//ftSetParamValue('json_fieldset',JSON.stringify(fieldset));

//-------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------


//-------------------------------------------------------------------------------------------------------------
//--------------------------------------------------Sending Data Out-------------------------------------------
//-------------------------------------------------------------------------------------------------------------

//-------------------------Encryption Stuff----------------------------

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

//-------------------------Send Data Somewhere----------------------------
//encrypt and prep to send
//need to have encryption key, dont post in repo
var key_str = ''
var crypt = getCryptData(fields,key_str);

var sub = {"metadata":{"page":page,
                        "matter":ftGetParamValue("matter_id"),
                        "party":ftGetParamValue("party_id"),
                        },
            "data":crypt};


//sub = JSON.stringify(sub);
//Send sub wherever

////Send to Tray Webhhok
// var root = "https://3f112ed9-c29c-4dad-b822-605ad0678af5.trayapp.io";
// var request = new XMLHttpRequest();
// request.open("POST", root);
// request.send(JSON.stringify(tagset));    

//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------


//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------

//Utiility to unhide everything on a pager
function divdump(elem) {
    div = elem.querySelector('div');
    if(div){
        div.style.display = "flex";
        div.classList.remove("ft--elem--hide");
        div.classList.remove("disable");
    }
}

var elem, div;
for (const[k,v] of Object.entries(elements)){
    try{
        elem = document.getElementById(k);
        elem.parentNode.parentNode.classList.remove('ft--elem--hide');
        elem.parentNode.parentNode.classList.remove('disable');
        elem.parentNode.parentNode.style.display = "flex";
        elem.parentNode.classList.remove('ft--elem--hide');
        elem.parentNode.classList.remove('disable');
        elem.parentNode.style.display = "flex";
        elem.style.dispay = "flex";
        elem.classList.remove('ft--elem--hide');
        elem.classList.remove('disable');
        divdump(elem);        

    }catch(error){};
}


//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------


