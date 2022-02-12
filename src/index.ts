export default class LiveGollection {
    private ws: WebSocket
    constructor(
        private url: string
    ) {
        this.ws = new WebSocket(url)
    }
}