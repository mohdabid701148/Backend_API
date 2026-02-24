class ApiResponse {
    constructor(statuseCode,data,message){
        this.message = message;
        this.data = data;
        this.statuseCode = statuseCode;
        this.success = statuseCode<400
    }
}
export {ApiResponse}