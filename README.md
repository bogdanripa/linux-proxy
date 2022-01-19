# Linux TCP Proxy

A proxy that connects a client to a target machine - both behind a firewall, as a 1:1 connection.
Example: If you want to RDP into a Windows machine that is in a different network, and none of you have public IPs

```
     ---------------
     | linux proxy |
     ---------------
       |          |
       |          |
  ----------    ----------
  | client |    | target |
  ----------    ----------
```

Note: both the client and the target machine must share a key (USERKEY) that will be used to identify them and map the TCP ports 

How this works:
* On the target machine (the one accepting connections) first calls http://SERVER-IP:8080/init/USERKEY
** SERVER-IP is where this project is being deployed
** The USERKEY can only contain word chars and digits
** In the response it will find a port number (PORTNUMBER) to be used later on
* On the server, run the following command (note that you must have socat installed):
** socat TCP4:SERVER-IP:PORTNUMBER TCP4:localhost:LOCALPORT
** PORTNUMBER must match the response from the previous call
** LOCALPORT must be the local port you want to forward. For example - the RDP port is 3389
* On on the client machine, you must call http://SERVER-IP:8080/connect/USERKEY
** The USERKEY must be the same as above
** In the response it will find a port number (CLIENTPORTNUMBER) that you will use later on
* On the client machine, you can now connect to SERVER-IP on port CLIENTPORTNUMBER to access the LOCALPORT on your target machine
