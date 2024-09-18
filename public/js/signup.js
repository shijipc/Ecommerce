   
   document.addEventListener("DOMContentLoaded", function () {
    const nameid = document.getElementById("name");
    const emailid = document.getElementById("email");
    const phoneid = document.getElementById("phone");
    const passid = document.getElementById("password");
    const cpassid = document.getElementById("confirm-password");
    const error1 = document.getElementById("error1");
    const error2 = document.getElementById("error2");
    const error3 = document.getElementById("error3");
    const error4 = document.getElementById("error4");
    const error5 = document.getElementById("error5");
    const signform = document.getElementById("signform");

    function nameValidateChecking() {
        const nameval = nameid.value.trim();
        const namepattern = /^[A-Za-z\s]+$/;

        if (nameval === "") {
            error1.style.display = "block";
            error1.innerHTML = "Please enter a valid name";
        } else if (!namepattern.test(nameval)) {
            error1.style.display = "block";
            error1.innerHTML = "Name can only contain alphabets and spaces";
        } else {
            error1.style.display = "none";
            error1.innerHTML = "";
        }
    }

    function emailValidateChecking() {
        const emailval = emailid.value.trim();
        const emailpattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

        if (!emailpattern.test(emailval)) {
            error2.style.display = "block";
            error2.innerHTML = "Invalid email format";
        } else {
            error2.style.display = "none";
            error2.innerHTML = "";
        }
    }

    function phoneValidateChecking() {
        const phoneval = phoneid.value.trim();

        if (phoneval === "") {
            error3.style.display = "block";
            error3.innerHTML = "Enter a valid phone number";
        } else if (phoneval.length !== 10 || isNaN(phoneval)) {
            //phonenumber length must be 10 digits 
            error3.style.display = "block";
            error3.innerHTML = "Enter a 10-digit phone number";
        } else {
            error3.style.display = "none";
            error3.innerHTML = "";
        }
    }

    function passValidateChecking() {
        const passval = passid.value;
        const cpassval = cpassid.value;
        const alpha = /[a-zA-Z]/;
        const digit = /\d/;  //its must be numeric

        if (passval.length < 8) {
            error4.style.display = "block";
            error4.innerHTML = "Should contain at least 8 characters";
        } else if (!alpha.test(passval) || !digit.test(passval)) {
            error4.style.display = "block";
            error4.innerHTML = "Should contain both letters and numbers";
        } else {
            error4.style.display = "none";
            error4.innerHTML = "";
        }

        if (passval !== cpassval) {
            error5.style.display = "block";
            error5.innerHTML = "Passwords do not match";
        } else {
            error5.style.display = "none";
            error5.innerHTML = "";
        }
    }

    signform.addEventListener("submit", function (e) {
        nameValidateChecking();
        emailValidateChecking();
        phoneValidateChecking();
        passValidateChecking();
       
          //oro  msg nu vendi oro error koduthathanu ithoke
        if (
            error1.innerHTML ||
            error2.innerHTML ||
            error3.innerHTML ||
            error4.innerHTML ||
            error5.innerHTML
        ) {
            e.preventDefault();
        }
    });
});

   
   
  