/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * The sample smart contract for documentation topic:
 * Writing Your First Blockchain Application
 */

package main

/* Imports
 * 4 utility libraries for formatting, handling bytes, reading and writing JSON, and string manipulation
 * 2 specific Hyperledger Fabric specific libraries for Smart Contracts
 */
import (
	/////////////////////////////////////////////

	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	utils "github.com/cd1/utils-golang"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	sc "github.com/hyperledger/fabric/protos/peer"
)

// Define the Smart Contract structure
type SmartContract struct {
}

// Define the car structure, with 4 properties.  Structure tags are used by encoding/json library
type Car struct {
	Make   string `json:"make"`
	Model  string `json:"model"`
	Colour string `json:"colour"`
	Owner  string `json:"owner"`
}
type Product struct {
	Doctype            string
	ProductID          string
	ProductName        string
	ProductCategory    string
	ProductDescription string
	Price              float64
	OwnerID            string
	SellStatus         string
	PicturePath        string
}
type User struct {
	Doctype        string
	FirstName      string
	Lastname       string
	Email          string
	PasswordHash   string
	Token          string
	UserID         string
	Balance        float64
	Address        string
	ContactNo      string
	ProfilePicPath string
	SoldProducts   float64
}
type Purchase struct {
	Doctype    string
	PurchaseID string
	BuyerID    string
	SellerID   string
	ProductID  string
	Price      float64
}
type Category struct {
	Doctype    string
	Name       string
	CategoryID string
}

type Notification struct {
	Doctype        string
	SellerID       string
	SellerName     string
	BuyerID        string
	BuyerName      string
	ProductName    string
	Price          float64
	NotificationID string
}

/*
 * The Init method is called when the Smart Contract "fabcar" is instantiated by the blockchain network
 * Best practice is to have any Ledger initialization in separate function -- see initLedger()
 */
func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) sc.Response {
	return shim.Success(nil)
}

/*
 * The Invoke method is called as a result of an application request to run the Smart Contract "fabcar"
 * The calling application program has also specified the particular smart contract function to be called, with arguments
 */
func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) sc.Response {

	// Retrieve the requested Smart Contract function and arguments
	function, args := APIstub.GetFunctionAndParameters()
	// Route to the appropriate handler function to interact with the ledger appropriately
	if function == "queryCar" {
		return s.queryCar(APIstub, args)
	} else if function == "initLedger" {
		return s.initLedger(APIstub)
	} else if function == "createCar" {
		return s.createCar(APIstub, args)
	} else if function == "queryAllCars" {
		return s.queryAllCars(APIstub)
	} else if function == "changeCarOwner" {
		return s.changeCarOwner(APIstub, args)
	} else if function == "getProduct" {
		return s.getProduct(APIstub, args)
	} else if function == "register" {
		return s.register(APIstub, args)
	} else if function == "login" {
		return s.login(APIstub, args)
	} else if function == "logout" {
		return s.logout(APIstub, args)
	} else if function == "uploadProduct" {
		return s.uploadProduct(APIstub, args)
	} else if function == "productDetail" {
		return s.productDetail(APIstub, args)
	} else if function == "userDetail" {
		return s.userDetail(APIstub, args)
	} else if function == "purchaseProduct" {
		return s.purchaseProduct(APIstub, args)
	} else if function == "getProductByCategory" {
		return s.getProductByCategory(APIstub, args)
	} else if function == "getCategory" {
		return s.getCategory(APIstub, args)
	} else if function == "getSoldNotification" {
		return s.getSoldNotification(APIstub, args)
	} else if function == "getPurchasedNotification" {
		return s.getPurchasedNotification(APIstub, args)
	}

	return shim.Error("Invalid Smart Contract function name.")
}

func (s *SmartContract) register(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 7 {
		return shim.Error("Incorrect number of arguments, required 3, given " + strconv.Itoa(len(args)))
	}

	firstName := args[0]
	lastName := args[1]
	address := args[2]
	contactNo := args[3]
	email := args[4]
	password := args[5]
	profilePicPath := args[6]

	h := sha256.New()
	h.Write([]byte(password))
	passwordHash := fmt.Sprintf("%x", h.Sum(nil))

	token := utils.RandomString()

	//key := utils.RandomString()
	userID := utils.RandomString()

	user := User{"user", firstName, lastName, email, passwordHash, token, userID, 100000, address, contactNo, profilePicPath, 0}
	jsonUser, err := json.Marshal(user)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = APIstub.PutState(userID, jsonUser)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success([]byte(token))
}

func (s *SmartContract) getProductByCategory(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	category := args[0]
	categorizedProductQuery := newCouchQueryBuilder().addSelector("Doctype", "product").addSelector("ProductCategory", category).addSelector("SellStatus", "available").getQueryString()
	categorizedProductJSON, _ := getJSONQueryResultForQueryString(APIstub, categorizedProductQuery)
	return shim.Success(categorizedProductJSON)
}

func (s *SmartContract) purchaseProduct(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments, required 2, given " + strconv.Itoa(len(args)))
	}
	productID := args[0]
	buyerID := args[1]

	productQuery := newCouchQueryBuilder().addSelector("Doctype", "product").addSelector("ProductID", productID).getQueryString()
	productData, _ := firstQueryValueForQueryString(APIstub, productQuery)
	var currentProduct Product
	_ = json.Unmarshal(productData, &currentProduct)

	buyerQuery := newCouchQueryBuilder().addSelector("Doctype", "user").addSelector("UserID", buyerID).getQueryString()
	buyerData, _ := firstQueryValueForQueryString(APIstub, buyerQuery)
	var currentBuyer User
	_ = json.Unmarshal(buyerData, &currentBuyer)
	currentBuyer.Balance = currentBuyer.Balance - currentProduct.Price
	buyer := User{"user", currentBuyer.FirstName, currentBuyer.Lastname, currentBuyer.Email, currentBuyer.PasswordHash, currentBuyer.Token, buyerID, currentBuyer.Balance, currentBuyer.Address, currentBuyer.ContactNo, currentBuyer.ProfilePicPath, currentBuyer.SoldProducts}
	jsonBuyer, err := json.Marshal(buyer)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = APIstub.PutState(buyerID, jsonBuyer)
	if err != nil {
		return shim.Error(err.Error())
	}

	sellrID := currentProduct.OwnerID

	sellerQuery := newCouchQueryBuilder().addSelector("Doctype", "user").addSelector("UserID", sellrID).getQueryString()
	sellerData, _ := firstQueryValueForQueryString(APIstub, sellerQuery)
	var currentSeller User
	_ = json.Unmarshal(sellerData, &currentSeller)
	currentSeller.Balance = currentSeller.Balance + currentProduct.Price
	seller := User{"user", currentSeller.FirstName, currentSeller.Lastname, currentSeller.Email, currentSeller.PasswordHash, currentSeller.Token, sellrID, currentSeller.Balance, currentSeller.Address, currentSeller.ContactNo, currentSeller.ProfilePicPath, currentSeller.SoldProducts + 1}
	jsonSeller, err := json.Marshal(seller)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = APIstub.PutState(sellrID, jsonSeller)
	if err != nil {
		return shim.Error(err.Error())
	}

	purchaseID := utils.RandomString()
	sellerID := currentProduct.OwnerID
	price := currentProduct.Price
	currentProduct.SellStatus = "sold"

	//key := utils.RandomString()

	purchase := Purchase{"purchase", purchaseID, buyerID, sellerID, productID, price}
	jsonPurchase, err := json.Marshal(purchase)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = APIstub.PutState(purchaseID, jsonPurchase)
	if err != nil {
		return shim.Error(err.Error())
	}

	jsonProduct, err := json.Marshal(currentProduct)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = APIstub.PutState(currentProduct.ProductID, jsonProduct)
	if err != nil {
		return shim.Error(err.Error())
	}

	//////////////////////

	notificationID := utils.RandomString()
	notification := Notification{"notification", sellerID, currentSeller.FirstName, buyerID, currentBuyer.FirstName, currentProduct.ProductName, currentProduct.Price, notificationID}
	jsonNotification, err := json.Marshal(notification)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = APIstub.PutState(notificationID, jsonNotification)
	if err != nil {
		return shim.Error(err.Error())
	}
	//////////////////////

	return shim.Success(nil)
}

func (s *SmartContract) logout(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments, required 1, given " + strconv.Itoa(len(args)))
	}

	userID := args[0]
	var user User

	jsonUser, err := APIstub.GetState(userID)
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println(jsonUser)

	err = json.Unmarshal(jsonUser, &user)
	if err != nil {
		return shim.Error(err.Error())
	}

	user.Token = utils.RandomString()

	jsonUser, err = json.Marshal(user)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = APIstub.PutState(userID, jsonUser)
	if err != nil {
		return shim.Error(err.Error())
	}
	fmt.Println("Logout successful")

	return shim.Success(nil)
}

func (s *SmartContract) uploadProduct(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 6 {
		return shim.Error("Incorrect number of arguments, required 4, given " + strconv.Itoa(len(args)))
	}

	productName := args[0]
	productCategory := args[1]
	productDescription := args[2]
	price, _ := strconv.ParseFloat(args[3], 64)
	ownerID := args[4]
	picturePath := args[5]

	productID := utils.RandomString()
	sellStatus := "available"
	matchCategoryQuery := newCouchQueryBuilder().addSelector("Doctype", "category").addSelector("Name", productCategory).getQueryString()
	matchCategory, err := APIstub.GetQueryResult(matchCategoryQuery)
	//matchCategoryJSON, err := json.Marshal(matchCategory)
	if !matchCategory.HasNext() {
		name := strings.ToLower(productCategory)
		categoryID := utils.RandomString()
		category := Category{"category", name, categoryID}

		jsonCategory, err := json.Marshal(category)
		if err != nil {
			return shim.Error(err.Error())
		}
		err = APIstub.PutState(categoryID, jsonCategory)
	}
	product := Product{"product", productID, productName, productCategory, productDescription, price, ownerID, sellStatus, picturePath}
	jsonProduct, err := json.Marshal(product)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = APIstub.PutState(productID, jsonProduct)
	if err != nil {
		return shim.Error(err.Error())
	}
	ret := "Uploaded the product"

	return shim.Success([]byte(ret))
}

func (s *SmartContract) getSoldNotification(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 0")
	}

	sellerID := args[0]

	notificationQuery := newCouchQueryBuilder().addSelector("Doctype", "notification").addSelector("SellerID", sellerID).getQueryString()
	notificationData, _ := getJSONQueryResultForQueryString(APIstub, notificationQuery)

	fmt.Println(string(notificationData))

	return shim.Success(notificationData)
}
func (s *SmartContract) getPurchasedNotification(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 0")
	}

	buyerID := args[0]

	notificationQuery := newCouchQueryBuilder().addSelector("Doctype", "notification").addSelector("BuyerID", buyerID).getQueryString()
	notificationData, _ := getJSONQueryResultForQueryString(APIstub, notificationQuery)

	fmt.Println(string(notificationData))

	return shim.Success(notificationData)
}

func (s *SmartContract) getCategory(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 0 {
		return shim.Error("Incorrect number of arguments. Expecting 0")
	}

	categoryQuery := newCouchQueryBuilder().addSelector("Doctype", "category").getQueryString()
	categoryData, _ := getJSONQueryResultForQueryString(APIstub, categoryQuery)

	fmt.Println(string(categoryData))

	return shim.Success(categoryData)
}

func (s *SmartContract) productDetail(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	productID := args[0]

	productQuery := newCouchQueryBuilder().addSelector("Doctype", "product").addSelector("ProductID", productID).getQueryString()
	productQueryData, _ := getJSONQueryResultForQueryString(APIstub, productQuery)

	return shim.Success(productQueryData)
}

func (s *SmartContract) userDetail(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	userID := args[0]

	userQuery := newCouchQueryBuilder().addSelector("Doctype", "user").addSelector("UserID", userID).getQueryString()
	userQueryData, _ := getJSONQueryResultForQueryString(APIstub, userQuery)

	return shim.Success(userQueryData)
}

func (s *SmartContract) login(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	email := args[0]
	password := args[1]
	h := sha256.New()
	h.Write([]byte(password))
	passwordHash := fmt.Sprintf("%x", h.Sum(nil))

	userQuery := newCouchQueryBuilder().addSelector("Doctype", "user").addSelector("Email", email).addSelector("PasswordHash", passwordHash).getQueryString()
	userQueryData, _ := getJSONQueryResultForQueryString(APIstub, userQuery)

	return shim.Success(userQueryData)
}

func (s *SmartContract) getProduct(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	key := args[0]

	myObject, err := APIstub.GetState(key)
	if err != nil {
		return shim.Error("getting object failed: " + err.Error())
	}
	var product1 Product
	err = json.Unmarshal(myObject, &product1)
	if err != nil {
		return shim.Error("getting object failed: " + err.Error())
	}
	return shim.Success(myObject)
}

/*func (s *SmartContract) setPerson(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 4 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	key := args[0]
	firstName := args[1]
	lastName := args[2]
	userid := args[3]
	p := Person{firstName, lastName, userid}
	pJson, err := json.Marshal(p)

	err = APIstub.PutState(key, pJson)
	if err != nil {
		return shim.Error("Putting object failed: " + err.Error())
	}

	ret := "putting object successful ;-) "

	return shim.Success([]byte(ret))

}*/

/*func (s *SmartContract) setProduct(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 4 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	key := args[0]
	firstName := args[1]
	lastName := args[2]
	price := args[3]
	p := Product{firstName, lastName, price}
	pJson, err := json.Marshal(p)

	err = APIstub.PutState(key, pJson)
	if err != nil {
		return shim.Error("Putting object failed: " + err.Error())
	}

	ret := "putting object successful ;-) "

	return shim.Success([]byte(ret))
}*/

func (s *SmartContract) queryCar(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	carAsBytes, _ := APIstub.GetState(args[0])
	return shim.Success(carAsBytes)
}

func (s *SmartContract) initLedger(APIstub shim.ChaincodeStubInterface) sc.Response {
	cars := []Car{
		Car{Make: "Toyota", Model: "Prius", Colour: "blue", Owner: "Tomoko"},
		Car{Make: "Ford", Model: "Mustang", Colour: "red", Owner: "Brad"},
		Car{Make: "Hyundai", Model: "Tucson", Colour: "green", Owner: "Jin Soo"},
		Car{Make: "Volkswagen", Model: "Passat", Colour: "yellow", Owner: "Max"},
		Car{Make: "Tesla", Model: "S", Colour: "black", Owner: "Adriana"},
		Car{Make: "Peugeot", Model: "205", Colour: "purple", Owner: "Michel"},
		Car{Make: "Chery", Model: "S22L", Colour: "white", Owner: "Aarav"},
		Car{Make: "Fiat", Model: "Punto", Colour: "violet", Owner: "Pari"},
		Car{Make: "Tata", Model: "Nano", Colour: "indigo", Owner: "Valeria"},
		Car{Make: "Holden", Model: "Barina", Colour: "brown", Owner: "Shotaro"},
	}

	i := 0
	for i < len(cars) {
		fmt.Println("i is ", i)
		carAsBytes, _ := json.Marshal(cars[i])
		APIstub.PutState("CAR"+strconv.Itoa(i), carAsBytes)
		fmt.Println("Added", cars[i])
		i = i + 1
	}

	return shim.Success(nil)
}

func (s *SmartContract) createCar(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 5 {
		return shim.Error("Incorrect number of arguments. Expecting 5")
	}

	var car = Car{Make: args[1], Model: args[2], Colour: args[3], Owner: args[4]}

	carAsBytes, _ := json.Marshal(car)
	APIstub.PutState(args[0], carAsBytes)

	return shim.Success(nil)
}

func (s *SmartContract) queryAllCars(APIstub shim.ChaincodeStubInterface) sc.Response {

	startKey := "CAR0"
	endKey := "CAR999"

	resultsIterator, err := APIstub.GetStateByRange(startKey, endKey)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing QueryResults
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Record\":")
		// Record is a JSON object, so we write as-is
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Printf("- queryAllCars:\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
}

func (s *SmartContract) changeCarOwner(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	carAsBytes, _ := APIstub.GetState(args[0])
	car := Car{}

	json.Unmarshal(carAsBytes, &car)
	car.Owner = args[1]

	carAsBytes, _ = json.Marshal(car)
	APIstub.PutState(args[0], carAsBytes)

	return shim.Success(nil)
}

// The main function is only relevant in unit test mode. Only included here for completeness.
func main() {

	// Create a new Smart Contract
	err := shim.Start(new(SmartContract))
	if err != nil {
		fmt.Printf("Error creating new Smart Contract: %s", err)
	}
}
