class Api {
    constructor(log_errors = 'alert', log_success = 'alert') {  
      const validLogValues = ['console', 'alert', 'silent'];
      if (!validLogValues.includes(log_errors)) {
        throw new Error(`Invalid log_errors value: ${log_errors}. Allowed values are: 'console', 'alert', 'silent'`);
      }
      if (!validLogValues.includes(log_success)) {
        throw new Error(`Invalid log_success value: ${log_success}. Allowed values are: 'console', 'alert', 'silent'`);
      }
  
      this.log_errors = log_errors; // Set the log_errors attribute
      this.log_success = log_success; // Set the log_success attribute
    }

    getBaseUrl(){
      let baseUrl;
      if (window.location.hostname === "geocastle.quest") {
        baseUrl = window.location.protocol + '//' + window.location.host + "/api";
      } else {
        baseUrl = "http://localhost:8003/api";
      }
      return baseUrl;
    }
  
    // Method to handle logging messages based on log type and the provided message
    logMessage(message, type = 'success') {
      if (type === 'success' && this.log_success === 'console') {
        console.log(message);
      } else if (type === 'success' && this.log_success === 'alert') {
        alert(message);
      } else if (type === 'error' && this.log_errors === 'console') {
        console.error(message);
      } else if (type === 'error' && this.log_errors === 'alert') {
        alert(message);
      }
    }
  
    async delete(endpoint, success_msg = "Successfully deleted data from endpoint", error_msg = "Error deleting data from endpoint") {
      if (!endpoint.startsWith('/')) {
        throw new Error(`Invalid endpoint: Endpoint must start with a '/'. Given endpoint: ${endpoint}`);
      }
      try {
        const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include',
          mode: "cors"
        });
  
        if (!response.ok) {
          return response.json().then((errorData) => {
            const errorDetail = errorData.detail || `HTTP error! Status: ${response.status}`;
            const fullErrorMsg = `${error_msg}: ${errorDetail}`; // Append errorDetail to error_msg
            this.logMessage(fullErrorMsg, 'error'); // Log the error message
            throw new Error(errorDetail); // Throw error to be caught in the catch block
          });
        }
  
        const data = await response.json();
        if(success_msg && success_msg != "")this.logMessage(success_msg, 'success'); // Log the success message
        return true; // Successfully deleted
      } catch (error) {
        this.logMessage(`${error_msg}: ${error.message}`, 'error'); // Log the error message if caught
        return false; // Error occurred
      }
    }
    
    async get(endpoint, success_msg = null, error_msg = "Error fetching data from endpoint") {
      if (!endpoint.startsWith('/')) {
        throw new Error(`Invalid endpoint: Endpoint must start with a '/'. Given endpoint: ${endpoint}`);
      }
      try {
        let response;
        try{
          response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            credentials: 'include',
            mode: 'cors'
          });
        
        } catch (error) {
          throw new Error(`Failed to fetch data from endpoint ${this.getBaseUrl()}${endpoint}. Error: ${error.message}`);
        }
  
        if (!response.ok) {
          return response.json().then((errorData) => {
            const errorDetail = errorData.detail || `HTTP error! Status: ${response.status}`;
            const fullErrorMsg = `${error_msg}: ${errorDetail}`; // Append errorDetail to error_msg
            this.logMessage(fullErrorMsg, 'error'); // Log the error message
          });
        }
  
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          throw new Error("Failed to parse server response. Response might not be in JSON format.");
        }
        if(success_msg && success_msg != "") this.logMessage(success_msg, 'success');
        return data;
      } catch (error) {
        if(error_msg && error_msg != "") this.logMessage(`${error_msg}: ${error.message}`, 'error'); 
        return false; // Error occurred
      }
    }

    async put(endpoint, data, success_msg = "Successfully updated data at endpoint", error_msg = "Error updating data at endpoint") {
      if (!endpoint.startsWith('/')) {
        throw new Error(`Invalid endpoint: Endpoint must start with a '/'. Given endpoint: ${endpoint}`);
      }
      try {
        const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
          mode: 'cors'
        });
  
        if (!response.ok) {
          return response.json().then((errorData) => {
            const errorDetail = errorData.detail || `HTTP error! Status: ${response.status}`;
            const fullErrorMsg = `${error_msg}: ${JSON.stringify(errorDetail)}`; // Append errorDetail to error_msg
            this.logMessage(fullErrorMsg, 'error'); // Log the error message
          });
        }
  
        const updatedData = await response.json();

        if(success_msg && success_msg != "")this.logMessage(success_msg, 'success'); // Log the success message
        return updatedData; // Return the updated data
      } catch (error) {
        this.logMessage(`${error_msg}: ${error.message}`, 'error'); // Log the error message if caught
        return false; // Error occurred
      }
    }

    async post(endpoint, data, success_msg = "Successfully created data at endpoint", error_msg = "Error creating data at endpoint") {
      if (!endpoint.startsWith('/')) {
        throw new Error("Invalid endpoint. It must start with a slash");
      }
    
      try {
        const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          mode: 'cors',
        });
    
        if (!response.ok) {
          const errorData = await response.json();
          const errorDetail = errorData.detail || `HTTP error with status ${response.status}`;
          const fullErrorMsg = `${error_msg}: ${errorDetail}`;
          console.error(fullErrorMsg);
          throw new Error(errorDetail);
        }
    
        const createdData = await response.json();
        if(success_msg && success_msg != "") this.logMessage(success_msg, 'success');
        return createdData;
      } catch (error) {
        console.error(`${error_msg}: ${error.message}`);
        if(error_msg && error_msg != "") this.logMessage(error_msg, 'error');

        return false;
      }
    }
    
  }

  window.aapi = new Api('alert', 'alert');//For debugging. Remove in production.
  
  export default Api;  
