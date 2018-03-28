//通过一个隐藏的iframe发起GET请求下载文件，response中需要设置cookie，根据cookie的值判断是成功还是失败。
//服务器需要支持iframe请求，需要设置X-Frame-Options。如果请求被拒绝，则会报错。

function fileDownload(fileUrl, successCallback, errorCallback) {
    //create a temporary iframe that is used to request the fileUrl as a GET request
    var $iframe = $("<iframe>").hide().prop("src", fileUrl).appendTo("body");

    //check if the file download has completed every checkInterval ms
    setTimeout(checkFileDownloadComplete, 100);

    function checkFileDownloadComplete() {
        //has the cookie been written due to a file download occuring?

        if (document.cookie.toLowerCase().indexOf("filedownload=true") > -1) {

            //execute specified success callback
            successCallback();

            //remove cookie
            document.cookie = "fileDownload=; path=/; expires=" + new Date(0).toUTCString() + ";";

            //remove iframe 
            $iframe.remove();
            return;
        }

        if (document.cookie.toLowerCase().indexOf("filedownload=false") > -1) {

            //execute specified fail callback
            errorCallback();

            //remove cookie
            document.cookie = "fileDownload=; path=/; expires=" + new Date(0).toUTCString() + ";";

            //remove iframe 
            $iframe.remove();
            return;
        }

        //has an error occured?
        //if neither containers exist below then the file download is occuring on the current window 

        //has an error occured?
        try {
            var iframeDoc = $iframe[0].contentWindow || $iframe[0].contentDocument;
            if (iframeDoc.document) {
                iframeDoc = iframeDoc.document;
            }
        } catch (err) {
            //500 error less than IE9 
            showAlert('danger', 'ERROR!', 'Document Not Found');
            //remove iframe 
            $iframe.remove();
            return;
        }

        //keep checking...
        setTimeout(checkFileDownloadComplete, 100);
    }
}
