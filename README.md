# Noter app REST API

Note creation and versioning application

## Installation

1. Clone this repository.
2. Install dependencies using yarn:
   ```bash
   yarn install
   ```
## Running as a Docker container
1. Build an image
    ```bash
       docker build . -t noter/node-web-app
    ```
2. Run the image
    ```bash
       docker run -p 4000:4000 --name noter-app -d noter/node-web-app
    ```
## Usage
1. To run the application for development, use the following command:
    ```bash
        yarn start:dev
    ```
2. To run the application for production, use the following command:
    ```bash
        yarn start
    ```
3. To run tests, use the following command:
    ```bash
        yarn test
    ```
    
## Configuration

Copy `sample-config.env` file and create a `config.env` file in the root directory and add your environment variables.
