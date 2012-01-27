function Constructor(number) {
    /*enter 'Constructor'*/
    /*unless(typeof number !== 'number') 'number', "Type error"*/
    function private_method() {
        /*enter 'private_method'*/
        console.log("test");
        /*exit 'private_method'*/
    }
    /*test_expose
        this.private_method = private_method;
    */
    this.priv = function () {
        /*enter 'priv'*/
        private_method();
        /*exit 'priv'*/
    }
    /*exit "Constructor"*/
}

var c = new Constructor("5");


c.priv();