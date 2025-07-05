/**
 * Spatial Audio System - Sistema de audio espacial 3D
 * Gestiona la posición y movimiento de sonidos en el espacio virtual
 */

class SpatialAudio {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.listener = audioContext.listener;
    this.spatialSources = new Map();
    this.roomEffects = new Map();
    this.isHRTFEnabled = true;
    this.environmentPresets = {
      'outdoor': { size: 'large', reverb: 0.1, absorption: 0.8 },
      'indoor': { size: 'medium', reverb: 0.3, absorption: 0.6 },
      'cave': { size: 'large', reverb: 0.8, absorption: 0.2 },
      'forest': { size: 'large', reverb: 0.4, absorption: 0.7 },
      'urban': { size: 'medium', reverb: 0.2, absorption: 0.5 }
    };
    this.currentEnvironment = 'outdoor';
    this.listenerPosition = { x: 0, y: 0, z: 0 };
    this.listenerOrientation = { x: 0, y: 0, z: -1, upX: 0, upY: 1, upZ: 0 };
  }

  createSpatialSource(id, audioBuffer, position = { x: 0, y: 0, z: 0 }) {
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Crear nodo de panorámica 3D
    const panner = this.audioContext.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;
    
    // Configurar posición inicial
    this.updateSourcePosition(panner, position);
    
    // Crear gain para control de volumen
    const gainNode = this.audioContext.createGain();
    
    // Conexión: source -> gain -> panner -> destination
    source.connect(gainNode);
    gainNode.connect(panner);
    
    // Aplicar efectos de ambiente si están activos
    const environmentGain = this.createEnvironmentEffects(id);
    if (environmentGain) {
      panner.connect(environmentGain);
    }
    
    // Almacenar referencia
    this.spatialSources.set(id, {
      source,
      panner,
      gainNode,
      position: { ...position },
      isPlaying: false,
      distance: this.calculateDistance(position, this.listenerPosition)
    });
    
    return { source, panner, gainNode };
  }

  updateSourcePosition(panner, position) {
    const currentTime = this.audioContext.currentTime;
    
    // Actualizar posición con interpolación suave
    panner.positionX.setValueAtTime(position.x, currentTime);
    panner.positionY.setValueAtTime(position.y, currentTime);
    panner.positionZ.setValueAtTime(position.z, currentTime);
  }

  moveSource(id, newPosition, duration = 0) {
    if (!this.spatialSources.has(id)) return;
    
    const spatialSource = this.spatialSources.get(id);
    const { panner } = spatialSource;
    
    if (duration > 0) {
      // Movimiento suave con interpolación
      const currentTime = this.audioContext.currentTime;
      panner.positionX.linearRampToValueAtTime(newPosition.x, currentTime + duration);
      panner.positionY.linearRampToValueAtTime(newPosition.y, currentTime + duration);
      panner.positionZ.linearRampToValueAtTime(newPosition.z, currentTime + duration);
    } else {
      // Movimiento inmediato
      this.updateSourcePosition(panner, newPosition);
    }
    
    // Actualizar posición almacenada
    spatialSource.position = { ...newPosition };
    spatialSource.distance = this.calculateDistance(newPosition, this.listenerPosition);
    
    // Actualizar efectos basados en distancia
    this.updateDistanceEffects(id);
  }

  updateListenerPosition(position, orientation = null) {
    const currentTime = this.audioContext.currentTime;
    
    // Actualizar posición del listener
    if (this.listener.positionX) {
      this.listener.positionX.setValueAtTime(position.x, currentTime);
      this.listener.positionY.setValueAtTime(position.y, currentTime);
      this.listener.positionZ.setValueAtTime(position.z, currentTime);
    }
    
    // Actualizar orientación si se proporciona
    if (orientation) {
      if (this.listener.forwardX) {
        this.listener.forwardX.setValueAtTime(orientation.x, currentTime);
        this.listener.forwardY.setValueAtTime(orientation.y, currentTime);
        this.listener.forwardZ.setValueAtTime(orientation.z, currentTime);
        this.listener.upX.setValueAtTime(orientation.upX, currentTime);
        this.listener.upY.setValueAtTime(orientation.upY, currentTime);
        this.listener.upZ.setValueAtTime(orientation.upZ, currentTime);
      }
      this.listenerOrientation = { ...orientation };
    }
    
    this.listenerPosition = { ...position };
    
    // Actualizar distancias de todas las fuentes
    this.spatialSources.forEach((spatialSource, id) => {
      spatialSource.distance = this.calculateDistance(spatialSource.position, position);
      this.updateDistanceEffects(id);
    });
  }

  calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  updateDistanceEffects(id) {
    if (!this.spatialSources.has(id)) return;
    
    const spatialSource = this.spatialSources.get(id);
    const { gainNode, distance } = spatialSource;
    
    // Aplicar atenuación por distancia
    const maxDistance = 50;
    const minDistance = 1;
    const normalizedDistance = Math.max(minDistance, Math.min(distance, maxDistance));
    const volumeMultiplier = 1 - (normalizedDistance - minDistance) / (maxDistance - minDistance);
    
    gainNode.gain.setValueAtTime(volumeMultiplier, this.audioContext.currentTime);
    
    // Aplicar filtro de paso bajo para distancias largas
    if (distance > 10) {
      const filterFrequency = Math.max(500, 20000 - (distance * 100));
      // Aquí se aplicaría un filtro de paso bajo si fuera necesario
    }
  }

  setEnvironment(environmentName) {
    if (!this.environmentPresets[environmentName]) return;
    
    this.currentEnvironment = environmentName;
    const preset = this.environmentPresets[environmentName];
    
    // Actualizar efectos de ambiente para todas las fuentes
    this.spatialSources.forEach((spatialSource, id) => {
      this.updateEnvironmentEffects(id, preset);
    });
  }

  createEnvironmentEffects(id) {
    const preset = this.environmentPresets[this.currentEnvironment];
    
    // Crear reverb
    const convolver = this.audioContext.createConvolver();
    const reverbGain = this.audioContext.createGain();
    const dryGain = this.audioContext.createGain();
    const wetGain = this.audioContext.createGain();
    
    // Configurar gains
    dryGain.gain.setValueAtTime(1 - preset.reverb, this.audioContext.currentTime);
    wetGain.gain.setValueAtTime(preset.reverb, this.audioContext.currentTime);
    
    // Generar impulse response para reverb
    const impulseBuffer = this.generateImpulseResponse(preset);
    convolver.buffer = impulseBuffer;
    
    // Conectar efectos
    reverbGain.connect(dryGain);
    reverbGain.connect(convolver);
    convolver.connect(wetGain);
    
    const mixer = this.audioContext.createGain();
    dryGain.connect(mixer);
    wetGain.connect(mixer);
    mixer.connect(this.audioContext.destination);
    
    // Almacenar efectos
    this.roomEffects.set(id, {
      convolver,
      reverbGain,
      dryGain,
      wetGain,
      mixer
    });
    
    return reverbGain;
  }

  generateImpulseResponse(preset) {
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * 2; // 2 segundos de reverb
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2);
        channelData[i] = (Math.random() * 2 - 1) * decay * preset.reverb;
      }
    }
    
    return buffer;
  }

  updateEnvironmentEffects(id, preset) {
    if (!this.roomEffects.has(id)) return;
    
    const effects = this.roomEffects.get(id);
    const currentTime = this.audioContext.currentTime;
    
    effects.dryGain.gain.setValueAtTime(1 - preset.reverb, currentTime);
    effects.wetGain.gain.setValueAtTime(preset.reverb, currentTime);
  }

  createZone(name, bounds, effects) {
    // Crear zona espacial con efectos específicos
    const zone = {
      name,
      bounds,
      effects,
      sources: new Set()
    };
    
    return zone;
  }

  checkZoneEntry(id, position) {
    // Verificar si una fuente entra en una zona específica
    // Implementar lógica de detección de zonas
  }

  dispose() {
    this.spatialSources.forEach(spatialSource => {
      try {
        spatialSource.source.stop();
      } catch (e) {}
    });
    
    this.roomEffects.forEach(effects => {
      // Desconectar efectos
      effects.mixer.disconnect();
    });
    
    this.spatialSources.clear();
    this.roomEffects.clear();
  }
}

export default SpatialAudio;