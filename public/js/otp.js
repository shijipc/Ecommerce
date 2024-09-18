document.getElementById("otp").focus();

    let timer = 60;
    let timerInterval;

    function startTimer() {
        timerInterval = setInterval(() => {
            timer--;
            document.getElementById("timerValue").textContent = timer;
            if (timer <= 0) {
                clearInterval(timerInterval);
                document.getElementById("timerValue").classList.add("expired");
                document.getElementById("timerValue").textContent = "Expired";
                document.getElementById("otp").disabled = true;
            }
        }, 1000);
    }
    startTimer();

    function validateOTPForm(){
        const otpInput=document.getElementById("otp").value;

        $.ajax({
            type:"POST",
            url:"verify-otp",
            data:{otp:otpInput},
            success:function(response){
                if(response.success){
                  Swal.fire({
                   icon:"success",
                   title:"OTP Verified Successfully",
                   showConfirmButton:false,
                   timer:1500,
                  }).then(()=>{
                    window.location.href=response.redirectUrl;
                  })                
                } else {
                    Swal.fire({
                        icon:"error",
                        title:Error,
                        text:response.message,
                    })
                }
            },
            error:function(){
                Swal.fire({
                    icon:"error",
                    title:"Invalid OTP",
                    text:"Please try again"
                })
            }
        })
        return false;
    }

    function resendOTP(){
        clearInterval(timerInterval);
        timer=60;
        document.getElementById("otpTimer").disabled=false;
        document.getElementById("timerValue").classList.remove("expired");
        startTimer();
        $.ajax({
            type:"POST",
            url:"/resend-otp",
            success:function(response){
                if(response.success){
                    Swal.fire({
                        icon:"success",
                        title:"OTP Resend Successfully",
                        showConfirmButton:false,
                        timer:1500,
                    })
                }else{
                    Swal.fire({
                        icon:"error",
                        title:"Error",
                        text:"An error occured while resending OTP.Please true",
                    })
                }
            }
        })
        return false;       
    }

