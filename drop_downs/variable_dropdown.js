//--------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------

//-----Method for 2 Variable Key Value Array Drop Downs
//-----When DropDown1 changes, DropDown2 maps array of values to select

//Put keys in DropDown1
//Put JSON in variable

//Condition: If Key changed and is not empty
//Set Value: make key_indicator_variable the key
//Javascript Node: 


var mappings = ftGetParamValue("json_mapping_var");
mappings=JSON.parse(mappings);

let sels = [];
var selection = String(ftGetParamValue("key_indicator_var"));

var tjsn = JSON.stringify(mappings);

var t = JSON.parse(tjsn, function(k, v){
	if (v.retailer === String(selection)) sels.push(v.vars);
    return v;
});

console.log(JSON.stringify(sels[0]));
ftSetParamValue("value_mapping_var",JSON.stringify(sels[0]));

//Wait node

//For DropDown2 that changes based on DropDown1
//Condition: If value_mapping_var changed and is not empty
//Set Value: Assign values for DropDown2 using: "Set Items from JSON" using value_mapping_var

//--------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------