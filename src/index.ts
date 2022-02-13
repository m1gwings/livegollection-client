/**
 * Represents the messages exchanged between livegollection clients and server to
 * allow live updates.
 * 
 * @typeParam ItemType - The type of items in the collection
 */
interface UpdateMessage<ItemType extends { id?: string }> {
    method: "CREATE" | "UPDATE" | "DELETE",
    id?: string,
    item: ItemType,
}

/**
 * This function can be used for type narrowing.
 * 
 * @param updMess
 * @returns true if `updMess` is an istance of UpdateMessage, false otherwise
 */
function isUpdateMessage<ItemType  extends { id?: string }>(updMess: UpdateMessage<ItemType>): updMess is UpdateMessage<ItemType> {
    if ("method" in updMess &&
        (updMess.method === LiveGollection.createMethodString || updMess.method === LiveGollection.updateMethodString ||
         updMess.method === LiveGollection.deleteMethodString) &&
        "id" in updMess && typeof updMess.id == "string" &&
        "item" in updMess
    ) {
        return true
    }

    return false
}

/**
 * Represents istances of livegollection clients. It handles the websocket
 * connection with the server by sending update messages to it and dispatching the
 * received ones to the corresponding event handlers (oncreate, onupdate, ondelete).
 * 
 * @typeParam ItemType - The type of items in the underlying collection
 */
export default class LiveGollection<ItemType extends { id?: string }> {
    static readonly createMethodString = "CREATE"
	static readonly updateMethodString = "UPDATE"
	static readonly deleteMethodString = "DELETE"

    private ws: WebSocket

    /**
     * @param url - route to the livegollection server-side websocket handler.
     */
    constructor(
        private url: string
    ) {
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
            this.onopen()
        }

        this.ws.onmessage = (ev: MessageEvent<any>) => {
            const updMess = JSON.parse(ev.data)
            if (isUpdateMessage<ItemType>(updMess)) {
                switch (updMess.method) {
                case LiveGollection.createMethodString:
                    this.oncreate(updMess.item)
                    break
                case LiveGollection.updateMethodString:
                    this.onupdate(updMess.item)
                    break
                case LiveGollection.deleteMethodString:
                    this.ondelete(updMess.item)
                    break
                }
            }
        }

        this.ws.onclose = () => {
            this.onclose()
        }
    }

    /**
     * Creates a NEW item in the livegollection: first the item will be added to the server collection,
     * then every client in the pool (also the one that has called this function) will receive
     * a create event (oncreate function will be invoked).
     * 
     * @remarks
     * 
     * If you want to add a new item to the livegollection this is the only way for doing so properly.
     * 
     * @param item - The NEW item that will be added to the livegollection
     */
    public create(item: ItemType): void {
        this.ws.send(
            this.craftUpdateMessage(
                LiveGollection.createMethodString,
                item
            )
        )
    }

    /**
     * Updates the item in the livegollection: first the item in the server collection will be updated,
     * then every client in the pool (also the one that has called this function) will receive
     * an update event (onupdate function will be invoked).
     * 
     * @remarks
     * 
     * If you want to modify an item in the livegollection this is the only way for doing so properly.
     * 
     * @param item - The item that will be updated in the livegollection
     */
    public update(item: ItemType): void {
        this.ws.send(
            this.craftUpdateMessage(
                LiveGollection.updateMethodString,
                item
            )
        )
    }

    /**
     * Deletes the item from the livegollection: first the item in the server collection will be deleted,
     * then every client in the pool (also the one that has called this function) will received
     * a delete event (ondelete function will be invoked).
     * 
     * @remarks
     * 
     * If you want to delete an item from the livegollection this is the only way for doing so properly.
     * 
     * @param item - The item that will be deleted from the livegollection
     */
    public delete(item: ItemType): void {
        this.ws.send(
            this.craftUpdateMessage(
                LiveGollection.deleteMethodString,
                item
            )
        )
    }

    /**
     * Crafts an update message that will be sent to the server.
     * 
     * @param method - method string for the update message
     * @param item - the item that this update message is referred to
     * @returns the JSON string of the update message
     */
    private craftUpdateMessage(method: "CREATE" | "UPDATE" | "DELETE", item: ItemType): string {
        let updMess: UpdateMessage<ItemType> = {
            method: method,
            item: item
        }

        if (item.id !== undefined) {
            updMess.id = item.id
        }

        return JSON.stringify(updMess)
    }

    /**
     * This event handler will be invoked when the client receives an update message from the
     * server regarding the creation of a new item. Set an appropriate handler to add the new item
     * to your local collection and update the view.
     * 
     * @param item - The NEW item added to the livegollection
     */
    public oncreate = (item: ItemType) => {
        return
    }

    /**
     * This event handler will be invoked when the client receives an update message from the
     * server regarding the update of an item already in the livegollection. Set an appropriate handler
     * to modify the item in your local collection and update the view.
     * 
     * @param item - An item alreaday in the livegollection that has been modified.
     */
    public onupdate = (item: ItemType) => {
        return
    }

    /**
     * This event handler will be invoked when the client receives an update message from the
     * server regarding the deletion of an item in the livegollection. Set an appropriate handler
     * to delete the item from your local collection and update the view.
     * 
     * @param item - An item in the livegollection that has been deleted.
     */
    public ondelete = (item: ItemType) => {
        return
    }

    /**
     * This event handler will be invoked when the underlying websocket connection has been opened.
     */
    public onopen = () => {
        return
    }

    /**
     * This event handler will be invoked when the underlying websocket connection has been closed.
     */
    public onclose = () => {
        return
    }
}
