import asyncio

from utils.socket_server import ServerSocket
from utils.message import Message, PopUp, Toast
from utils.console import Style, deprecated

class Server:
    """
    Server class that handles the app.
    """

    def __init__(self):
        self.socket = ServerSocket(_print=True)

    async def run(self):

        self.set_up_event_listeners() # See README.md for more details

        # Start the server properly
        async with self.socket:
            await self.socket.wait_for_clients(1) # Wait for at least one client to connect

            await asyncio.sleep(1)
            
            # Remove the greeting event after 1 seconds
            self.socket.off(
                ServerSocket.EVENTS_TYPES.on_client_connect,
                "greeting-event"
            )

            await self.socket.broadcast(
                PopUp(
                    "The greeting event has been removed after 1 seconds."
                )
            )

            await self.socket.wait() # Keep the server running
            # The server will keep running until manually stopped:
            #  - e.g., Ctrl+C in the terminal
            #  - or by calling `self.socket.stop()` method to stop it programmatically

            print(Style("PRIMARY", "End of the demo."))

        
    def set_up_event_listeners(self):
        """
        Set up the event listeners for the server.
        """
        
        # Register the socket events
        self.socket.on(
            ServerSocket.EVENTS_TYPES.on_client_connect,
            "greeting-event",
            lambda client: self.socket.send(
                client,
                Toast(
                    "Welcome to the server! You are connected."
                )
            )
        )

        self.socket.on(
            ServerSocket.EVENTS_TYPES.on_message,
            "message-event",
            lambda client, message: self.socket.send(
                client,
                Message(
                    f"Received message: {message.content}", # client messages are auto cast to Message or subclasses
                    type="response"
                )
            )
        )

    @deprecated("This version is not safe")
    async def unsafe_run(self):
        """
        Run the server in an unsafe way.
        This method is deprecated and should not be used.
        """

        await self.socket._start()

        self.set_up_event_listeners()  # Set up the event listeners
        await self.socket.wait_for_clients(1)
        # Wait for at least one client to connect
        await asyncio.sleep(1)

        await self.socket.broadcast(
            PopUp(
                "The greeting event has been removed after 1 seconds."
            )
        )

        await self.socket.wait() # Keep the server running

        await self.socket.stop() # Stop the server programmatically


if __name__ == "__main__":
    server = Server()
    asyncio.run(server.run())