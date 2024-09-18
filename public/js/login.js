document.addEventListener("DOMContentLoaded", function () {
    const emailid = document.getElementById("email");
    const passid = document.getElementById("password");
    const error1 = document.getElementById("error1");
    const error2 = document.getElementById("error2");
    const loginform = document.getElementById("loginform");

    if (!emailid || !passid || !error1 || !error2 || !loginform) {
        console.error("One or more elements not found");
        return;
    }

    function emailValidateChecking() {
        const emailval = emailid.value.trim();
        const emailpattern = /^[a-zA-Z0-9._-]+@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,4})$/;

        if (!emailval) {
            error1.style.display = "block";
            error1.innerHTML = "Email is required";
        } else if (!emailpattern.test(emailval)) {
            error1.style.display = "block";
            error1.innerHTML = "Invalid format";
        } else {
            error1.style.display = "none";
            error1.innerHTML = "";
        }
    }

    function passValidateChecking() {
        const passval = passid.value.trim();

        if (!passval) {
            error2.style.display = "block";
            error2.innerHTML = "Password is required";
        } else if (passval.length < 8) {
            error2.style.display = "block";
            error2.innerHTML = "Should contain at least 8 characters";
        } else {
            error2.style.display = "none";
            error2.innerHTML = "";
        }
    }

    loginform.addEventListener("submit", function (e) {
        emailValidateChecking();
        passValidateChecking();

        if (error1.innerHTML || error2.innerHTML) {
            console.log("Form validation failed");
            e.preventDefault();
        } else {
            console.log("Form validated, submitting");
        }
    });
});
