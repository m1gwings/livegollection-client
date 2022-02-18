# livegollection-client
**livegollection-client** is the JavaScript/TypeScript client-side library to interact with the correspondant server-side Golang library **[livegollection](https://github.com/m1gwings/livegollection)**.

If you haven't done it yet, check out **[livegollection](https://github.com/m1gwings/livegollection)** before continuing to read this page.
# Install
**livegollection-client** is distributed on [npm](https://www.npmjs.com/package/livegollection-client) but you can also find the source code on [GitHub](https://github.com/m1gwings/livegollection-client).

The simplest way to add **livegollection-client** to your project is:
```bash
npm install livegollection-client
```
# How to use
In this section we'll assume that you have installed **livegollection-client** from npm.
## Import
**livegollection-client** default exports the LiveGollection class as an ES2015 module. You can simply import it in your script:
```javascript
import LiveGollection from "path/to/node_modules/livegollection-client/dist/index.js"; 
```
## Create the LiveGollection object
To interact with server-side **livegollection** we need to crate a LiveGollection object. LiveGollection constructor takes an url as a parameter, this url points to the **livegollection** websocket handler: in fact you must use `ws://` or `wss://` in the URL protocol field. The domain of the url is the domain of your server (localhost if you're testing the project in local). The path of the url depends on the route where you have set the **livegollection** handler.

For example if you have written this on your server executable:
```go
// ...
liveGoll := livegollection.NewLiveGollection(//...
// ...
http.HandleFunc("/livegollection", liveGoll.Join)
http.ListenAndServe("localhost:8080", nil)
// ...
```
the correspondant url is `ws://localhost:8080/livegollection` so you can create the LiveGollection object as follows:
```javascript
let liveGoll = new LiveGollection("ws://localhost:8080/livegollection");
```
NOTE: You must use TLS if you want to connect with a websocket to a remote server (in other words you can use `ws://` only when you are testing in local).
## Set event handlers
Every time an item in the collection is created, updated or deleted the LiveGollection object created in the previous step gets notified from the server and will invoke the correspondant event handler among **oncreate**, **onupdate** or **ondelete**.

We need to set the appropriate code for each one of this event handlers **(updates WON'T be processed until every handler has been set)**:
```javascript
liveGoll.oncreate = (item) => {
    // Add element to DOM
};

liveGoll.onupdate = (item) => {
    // Modify element in the DOM
};

liveGoll.ondelete = (item) => {
    // Delete item from the DOM
};
```
There are also two others event handlers: **onopen** and **onclose** invoked when the websocket underlying connection has been opened/closed. You don't need to set them but they could be useful.
## Interact with the collection
The proper way to interact with the collection are the three methods provided by the LiveGollection object: **create**, **update** and **delete**. Every one of these methods takes just one parameter: an item to create/update/delete.

NOTE: When you invoke one of the method above the server receives the update and will send it to EVERY client in the pool, also to the one that has emitted the update, so you don't need to update the DOM when you call such methods.

Suppose that you have defined some buttons to create, update or delete an item, you can do the following:
```javascript
createButton.onclick = () => {
    liveGoll.create({
        // Fill fields of the item object, you don't need to set the id, the server will take care of that
        fieldOne: // ...
        fieldTwo: // ...
        // ...
    });
}
// ...
updateButton.onclick = () => {
    itemToUpdate.fieldToUpdate = newValue;
    liveGoll.update(itemToUpdate);
}
// ...
deleteButton.onclick = () => {
    liveGoll.delete(itemToDelete);
}
```
As mentioned in the comment, when you create an item you don't need to set its id, the server will take care of that.
# Example app
If you want a concrete example of usage of **livegollection** and **livegollection-client** check out this [example app](https://github.com/m1gwings/livegollection-example-app).
