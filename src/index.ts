/**
 * Available methods for update messages.
 */
 type MethodString = "CREATE" | "UPDATE" | "DELETE"

/**
 * Represents the messages exchanged between livegollection clients and server to
 * allow live updates.
 * 
 * @typeParam IdType - The type of items' id
 * @typeParam ItemType - The type of items in the collection
 */
interface UpdateMessage<IdType, ItemType extends { id?: IdType }> {
    method: MethodString,
    id?: IdType,
    item: ItemType,
}

/**
 * This function can be used for type narrowing.
 * 
 * @param updMess
 * @returns true if `updMess` is an istance of UpdateMessage, false otherwise
 */
function isUpdateMessage<IdType, ItemType  extends { id?: IdType }>(updMess: UpdateMessage<IdType, ItemType>): updMess is UpdateMessage<IdType, ItemType> {
    if ("method" in updMess &&
        (updMess.method === LiveGollection.createMethodString || updMess.method === LiveGollection.updateMethodString ||
         updMess.method === LiveGollection.deleteMethodString) &&
        "id" in updMess && "item" in updMess
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
 * @typeParam IdType - The type of items' id in the underlying collection
 * @typeParam ItemType - The type of items in the underlying collection
 */
export default class LiveGollection<IdType, ItemType extends { id?: IdType }> {
    static readonly createMethodString = "CREATE"
	static readonly updateMethodString = "UPDATE"
	static readonly deleteMethodString = "DELETE"

    private ws: WebSocket
    private hasConnBeenOpened: boolean = false
    private hasConnBeenClosed: boolean = false

    // If the handlers have not been set yet, incoming updates will be cached in this array
    private cachedReceivedUpdates: UpdateMessage<IdType, ItemType>[] = []

    // If the connection has not been opened yet, outgoing updates will be cached in this array
    private cachedUpdatesToSend: UpdateMessage<IdType, ItemType>[] = []

    private isOnCreateSet: boolean = false
    private isOnUpdateSet: boolean = false
    private isOnDeleteSet: boolean = false
    private isOnOpenSet: boolean = false
    private isOnCloseSet: boolean = false

    /**
     * @remarks
     * 
     * If you want to connect to a remote server you must use TLS (and wss:// in the URL protocol field).
     * ws:// is OK only if you are testing in local.
     * 
     * @param url - route to the livegollection server-side websocket handler, for example "ws://localhost:8080/livegollection"
     */
    constructor(
        private url: string
    ) {
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
            this.hasConnBeenOpened = true
            if (this.isOnOpenSet) {
                this._onopen()
            }
            this.cachedUpdatesToSend.forEach(updMess => this.ws.send(JSON.stringify(updMess)))
            this.cachedUpdatesToSend = []
        }

        this.ws.onmessage = (ev: MessageEvent<any>) => {
            const updMess = JSON.parse(ev.data)
            if (isUpdateMessage<IdType, ItemType>(updMess)) {
                if (!this.isOnCreateSet || !this.isOnUpdateSet || !this.isOnDeleteSet) {
                    this.cachedReceivedUpdates.push(updMess)
                } else {
                    this.processUpdate(updMess)
                }
            }
        }

        this.ws.onclose = () => {
            this.hasConnBeenClosed = true
            if (this.isOnCloseSet) {
                this._onclose()
            }
        }
    }

    /**
     * Dispatches the update message to the appropriate handler between oncreate, onupdate and ondelete.
     * 
     * @remarks
     * 
     * Before invoking this function make sure that ALL the handlers have been set.
     * In other words `isOnCreateSet && isOnUpdateSet && isOnDeleteSet` must be true.
     * 
     * @param updMess - The update message that has to be dispatched
     */
    private processUpdate(updMess: UpdateMessage<IdType, ItemType>) {
        switch (updMess.method) {
        case LiveGollection.createMethodString:
            this._oncreate(updMess.item)
            break
        case LiveGollection.updateMethodString:
            this._onupdate(updMess.item)
            break
        case LiveGollection.deleteMethodString:
            this._ondelete(updMess.item)
            break
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
        this.craftAndSendUpdateMessage(item, LiveGollection.createMethodString)
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
        this.craftAndSendUpdateMessage(item, LiveGollection.updateMethodString)
    }

    /**
     * Deletes the item from the livegollection: first the item in the server collection will be deleted,
     * then every client in the pool (also the one that has called this function) will receive
     * a delete event (ondelete function will be invoked).
     * 
     * @remarks
     * 
     * If you want to delete an item from the livegollection this is the only way for doing so properly.
     * 
     * @param item - The item that will be deleted from the livegollection
     */
    public delete(item: ItemType): void {
        this.craftAndSendUpdateMessage(item, LiveGollection.deleteMethodString)
    }

    /**
     * Crafts an update message with the given `item` and `method` and,
     * if the connection has been opened, sends it to the server.
     * Otherwise the update will be cached in `this.cachedUpdatesToSend`.
     * 
     * @param method - method string for the update message
     * @param item - the item that this update message is referred to
     */
    private craftAndSendUpdateMessage(item: ItemType, method: MethodString) {
        let updMess: UpdateMessage<IdType, ItemType> = {
            method: method,
            item: item
        }

        if (item.id !== undefined) {
            updMess.id = item.id
        }

        if (!this.hasConnBeenOpened) {
            this.cachedUpdatesToSend.push(updMess)
        } else {
            this.ws.send(JSON.stringify(updMess))
        }
    }

    private _oncreate!: (item: ItemType) => void
    private _onupdate!: (item: ItemType) => void
    private _ondelete!: (item: ItemType) => void
    private _onopen!: () => void
    private _onclose!: () => void

    /**
     * This event handler will be invoked when the client receives an update message from the
     * server regarding the creation of a new item. Set an appropriate handler to add the new item
     * to your local collection and update the view.
     * 
     * @remarks
     * 
     * You also must set onupdate and ondelete event handlers otherwise NO update will be processed (neither CREATE updates). 
     * 
     * @param item - The NEW item added to the livegollection
     */
    public set oncreate(handler: (item: ItemType) => void) {
        this._oncreate = handler
        if (!this.isOnCreateSet && this.isOnUpdateSet && this.isOnDeleteSet) {
            this.cachedReceivedUpdates.forEach(updMess => this.processUpdate(updMess))
            this.cachedReceivedUpdates = []
        }
        this.isOnCreateSet = true
    }

    /**
     * This event handler will be invoked when the client receives an update message from the
     * server regarding the update of an item already in the livegollection. Set an appropriate handler
     * to modify the item in your local collection and update the view.
     * 
     * @remarks
     * 
     * You also must set oncreate and ondelete event handlers otherwise NO update will be processed (neither UPDATE updates).
     * 
     * @param item - An item alreaday in the livegollection that has been modified
     */
    public set onupdate(handler: (item: ItemType) => void) {
        this._onupdate = handler
        if (this.isOnCreateSet && !this.isOnUpdateSet && this.isOnDeleteSet) {
            this.cachedReceivedUpdates.forEach(updMess => this.processUpdate(updMess))
            this.cachedReceivedUpdates = []
        }
        this.isOnUpdateSet = true
    }

    /**
     * This event handler will be invoked when the client receives an update message from the
     * server regarding the deletion of an item in the livegollection. Set an appropriate handler
     * to delete the item from your local collection and update the view.
     * 
     * @remarks
     * 
     * You also must set oncreate and onupdate event handlers otherwise NO update will be processed (neither DELETE updates).
     * 
     * @param item - An item in the livegollection that has been deleted
     */
    public set ondelete(handler: (item: ItemType) => void) {
        this._ondelete = handler
        if (this.isOnCreateSet && this.isOnUpdateSet && !this.isOnDeleteSet) {
            this.cachedReceivedUpdates.forEach(updMess => this.processUpdate(updMess))
            this.cachedReceivedUpdates = []
        }
        this.isOnDeleteSet = true
    }

    /**
     * This event handler will be invoked when the underlying websocket connection has been opened.
     */
    public set onopen(handler: () => void) {
        this._onopen = handler
        this.isOnOpenSet = true
        if (this.hasConnBeenOpened) {
            handler()
        }
    }

    /**
     * This event handler will be invoked when the underlying websocket connection has been closed.
     */
    public set onclose(handler: () => void) {
        this._onclose = handler
        this.isOnCloseSet = true
        if (this.hasConnBeenClosed) {
            handler()
        }
    }
}
