import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { HubConnection, HubConnectionBuilder } from '@aspnet/signalr';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  private _hubConnection!: HubConnection;

  me!: User | undefined;
  users!: User[] | undefined;
  rooms!: RoomInfo[] | undefined;

  audioCtl: HTMLAudioElement = new Audio();
  remoteAudioCtl: HTMLAudioElement = new Audio();

  //context: AudioContext = new AudioContext();    // Audio context
  buf!: AudioBuffer;        // Audio buffer

  localPeerConnection!: RTCPeerConnection;
  iceCandidatesArray: RTCIceCandidateInit[] = [];

  userForm = new FormGroup({
    username: new FormControl('')
  });

  roomForm = new FormGroup({
    roomName: new FormControl('')
  });

  ngOnInit(): void {
    this.createConnection();
    this.startConnection();
    this.subscribeForHubEvents();
    this.createRTCPeerConnection()
      .then(() => {
        console.log('PeerConnection local criada com sucesso!')
        this.registerRTCEventHandlers();
      });
  }

  ngOnDestroy(): void {
    this._hubConnection.stop()
      .then(() => {
        console.log('Removendo a conexão com o signalR');
      });
  }

  public subscribeForHubEvents(): void {
    this._hubConnection.on('UpdateRooms', (data) => {
      console.log('{on:UpdateRooms}');
      console.log(data);
      this.rooms = <RoomInfo[]>(JSON.parse(data));
    });

    this._hubConnection.on('UpdateUsers', (data) => {
      console.log('{on:UpdateUsers}');
      console.log(data);
      this.users = <User[]>(JSON.parse(data));
      const me = this.users.find(u => u.Id == this.me?.Id);
      this.me = me;
    });

    this._hubConnection.on('UserCreated', (data) => {
      console.log('{on:UserCreated}');
      console.log(data);
      this.me = <User>(JSON.parse(data));
    });

    this._hubConnection.on('UserExited', (data) => {
      console.log('{on:UserExited}');
      console.log(data);
    });

    this._hubConnection.on('UserExitedRoom', (data) => {
      console.log('{on:UserExitedRoom}');
      console.log(data);
    });

    this._hubConnection.on('ExitedRoom', (data) => {
      console.log('{on:ExitedRoom}');
      console.log(data);
    });

    this._hubConnection.on('JoinedRoom', (data) => {
      console.log('{on:JoinedRoom}');
      console.log(data);
    });

    this._hubConnection.on('UserJoinedRoom', (data) => {
      console.log('{on:UserJoinedRoom}');
      console.log(data);
    });

    this._hubConnection.on('IceCandidateResult', (candidate) => {
      console.log('{on:IceCandidateResult}');
      console.log('Adicionando ICE candidate');
      console.log(candidate);
      const iceInit = <RTCIceCandidateInit>candidate;
      if (this.localPeerConnection.connectionState != 'connected') {
        console.log('Adicionando candidate na lista para inserir após conexão');
        this.iceCandidatesArray.push(iceInit);
      } else {
        this.addIceCandidate(candidate);
      }
    });
  }

  public addIceCandidate(candidate: RTCIceCandidateInit): void {
    this.localPeerConnection.addIceCandidate(candidate)
      .then(() => {
        console.log('ICE candidate adicionado');
      })
      .catch((e) => {
        console.log('Erro ao adicionar ICE candidate');
        console.log(e);
      });
  }

  public createConnection(): void {
    console.log('Iniciada conexão com o signalR na url: https://localhost:5001/rtc');
    this._hubConnection = new HubConnectionBuilder()
      .withUrl('https://192.168.13.135:5001/rtc')
      .build();
  }

  public startConnection(): void {
    this._hubConnection.start()
      .then(() => {
        console.log('Iniciada conexão com o signalR');
      })
      .catch((e) => {
        console.log('Erro ao iniciar a conexão com o signalR: ' + e);
      })
  }

  public createUser(): void {
    const username = this.userForm.value['username'];
    console.log('Criando usuário:' + username);
    this._hubConnection.invoke('CreateUser', username);
  }

  public createRoom(): void {
    const roomName = this.roomForm.value['roomName'];
    console.log('Criando sala: ' + roomName);
    this._hubConnection.invoke('CreateRoom', roomName);
  }

  public joinRoom(roomId: string): void {
    console.log('Entrando na sala: ' + roomId);
    // TODO: CHAMAR O GET OFFER DO SERVIDOR
    this._hubConnection.invoke('JoinRoom', roomId)
      .then(() => {
        this.getServerOffer();
      });
  }

  public leaveRoom(roomId: string): void {
    console.log('Saindo da sala: ' + roomId);
    this._hubConnection.invoke('LeaveRoom', roomId);
  }

  public startCall(roomId: string): void {
    console.log('Saindo da sala: ' + roomId);
  }

  public async getUserMedia(): Promise<MediaStream> {
    return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
  }

  public async createRTCPeerConnection(): Promise<void> {
    const servers = <RTCIceServer[]>[
      {
        urls: 'stun:stun1.l.google.com:19302'
      },
      {
        urls: 'stun:stun2.l.google.com:19302'
      },
      {
        urls: 'stun:stun3.l.google.com:19302'
      },
      {
        urls: 'stun:stun4.l.google.com:19302'
      },
      {
        urls: 'stun:stun.ekiga.net'
      },
      {
        urls: 'stun:stun.ideasip.com'
      },
      {
        urls: 'turn:numb.viagenie.ca',
        credential: 'muazkh',
        username: 'webrtc@live.com',
        credentialType: 'password'
      },
      {
        urls: "turn:192.158.29.39:3478?transport=udp",
        credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
        username: "28224511:1379330808",
        credentialType: 'password'
      },
      {
        urls: "turn:192.158.29.39:3478?transport=tcp",
        credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
        username: "28224511:1379330808",
        credentialType: 'password'
      },
      {
        urls: "turn:turn.bistri.com:80",
        credential: "homeo",
        username: "homeo",
        credentialType: 'password'
      },
      {
        urls: "turn:turn.anyfirewall.com:443?transport=tcp",
        credential: "webrtc",
        username: "webrtc",
        credentialType: 'password'
      }
    ];

    const config = <RTCConfiguration>{ iceServers: servers, iceCandidatePoolSize: 15 };

    console.log('Criando PeerConnection do cliente');

    this.localPeerConnection = new RTCPeerConnection(config);
    this.localPeerConnection.setConfiguration(config);

    const localStream = await this.getUserMedia();
    console.log('Midias adquiridas com sucesso');

    localStream.getTracks().forEach(track => {
      console.log("Midia: " + track.kind + " adicionada");
      this.localPeerConnection.addTrack(track, localStream);
    });
  }

  public registerRTCEventHandlers(): void {
    console.log('Registrando eventos de RTC');

    this.localPeerConnection.onicegatheringstatechange = () => {
      console.log("onicegatheringstatechange: " + this.localPeerConnection.iceGatheringState);
      if (this.localPeerConnection.iceGatheringState == 'complete') {
        this.iceCandidatesArray.forEach((c) => {
          this.addIceCandidate(c);
        });
      }
    };

    this.localPeerConnection.oniceconnectionstatechange = () => {
      console.log("oniceconnectionstatechange: " + this.localPeerConnection.iceConnectionState);
      if (this.localPeerConnection.connectionState == 'connected') {
        if (this.iceCandidatesArray.length > 0) {
          console.log('Adicionando ICE candidates que estavam aguardando a conexão');
          // this.iceCandidatesArray.forEach((c) => {
          //   this.addIceCandidate(c);
          // })
          // // esvazia 
          // this.iceCandidatesArray = [];
        }
      }
    };

    this.localPeerConnection.onsignalingstatechange = () => {
      console.log("onsignalingstatechange: " + this.localPeerConnection.signalingState);
    };

    this.localPeerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('Novo IceCandidate:');
        console.log(event.candidate.candidate);
        console.log(event.candidate);
        this._hubConnection.invoke('AddIceCandidate', event.candidate);
      }
    };

    this.localPeerConnection.ontrack = (event) => {
      console.log("ontrack: " + event.track.kind);
      const audio = <HTMLAudioElement>document.getElementById('remoteAudioCtl');
      audio.srcObject = event.streams[0];
      audio.play();
    };

    this.localPeerConnection.ondatachannel = (event) => {
      console.log('ondatachannel');
      console.log(event.channel);
      const dataChannel = event.channel;

      dataChannel.onopen = () => {
        console.log('DataChannel Open');
      };

      dataChannel.onclose = () => {
        console.log('DataChannel Close');
      };

      dataChannel.onmessage = (event) => {
        console.log('Mensagem recebida do datachannel');
        console.log(event);
        console.log(event.data);
        //this.playByteArray(event.data);
      };
    };

    this.localPeerConnection.onnegotiationneeded = (event) => {
      console.warn('{localPeerConnection.onnegotiationneeded}');
      this.localPeerConnection.createOffer()
      .then((offer) => {
        return this.localPeerConnection.setLocalDescription(offer);
      })
      .then((offer) => {
        console.log(offer);
      })
      .catch((e) => console.error(e));
    };
  }

  public getServerOffer(): void {
    this._hubConnection.invoke('GetServerOffer')
      .then((data) => {
        data.type = 'offer'; // XUNXO ALERT
        const serverSDPOffer = <RTCSessionDescriptionInit>data;
        console.log('Resposta de oferta do servidor:');
        console.log(serverSDPOffer);
        this.setAnswer(serverSDPOffer);
      })
  }

  public setAnswer(offer: RTCSessionDescriptionInit): void {
    this.localPeerConnection.setRemoteDescription(offer)
      .then(() => {
        this.localPeerConnection.createAnswer()
          .then((answer) => {
            return this.localPeerConnection.setLocalDescription(answer);
          })
          .then(async () => {
            console.log('Enviando resposta ao servidor');
            console.log('SDP: ' + this.localPeerConnection.localDescription?.sdp);
            //this.localPeerConnection.localDescription.type = 'answer'; // XUNXO ALERT
            this._hubConnection.invoke('SetRemoteDescription', { sdp: this.localPeerConnection.localDescription?.sdp, type: 0 });
          });
      });

  }
}

export interface RoomInfo {
  Id: string;
  Name: string;
  Users: User[]
}

export interface User {
  Id: string;
  Username: string;
  ConnectionId: string;
  IsInCall: boolean;
  Room: RoomInfo;
}
