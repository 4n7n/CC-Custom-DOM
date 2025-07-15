/**
 * Sponsor Profiles Module
 * Gestiona perfiles individuales de patrocinadores y su información detallada
 */

class SponsorProfiles {
    constructor(config = {}) {
        this.config = {
            cacheExpiry: 300000, // 5 minutos
            enableHistory: true,
            trackInteractions: true,
            autoSave: true,
            ...config
        };
        
        this.profiles = new Map();
        this.cache = new Map();
        this.interactions = new Map();
        this.listeners = new Set();
        this.currentProfile = null;
        
        this.profileSchema = {
            id: { type: 'string', required: true },
            name: { type: 'string', required: true },
            email: { type: 'email', required: true },
            phone: { type: 'string', required: false },
            company: { type: 'object', required: true },
            contact: { type: 'object', required: true },
            financial: { type: 'object', required: true },
            engagement: { type: 'object', required: true },
            preferences: { type: 'object', required: false },
            history: { type: 'array', required: false },
            documents: { type: 'array', required: false },
            notes: { type: 'array', required: false }
        };
    }

    /**
     * Inicializa el módulo de perfiles de patrocinadores
     */
    async initialize() {
        try {
            console.log('👤 Inicializando Sponsor Profiles...');
            
            // Cargar perfiles existentes
            await this.loadProfiles();
            
            // Configurar auto-guardado
            this.setupAutoSave();
            
            // Configurar tracking de interacciones
            if (this.config.trackInteractions) {
                this.setupInteractionTracking();
            }
            
            console.log('✅ Sponsor Profiles inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Sponsor Profiles:', error);
            throw error;
        }
    }

    /**
     * Crea un nuevo perfil de patrocinador
     */
    async createProfile(profileData) {
        try {
            // Validar datos del perfil
            const validatedData = this.validateProfileData(profileData);
            
            // Generar ID único si no existe
            if (!validatedData.id) {
                validatedData.id = this.generateUniqueId();
            }
            
            // Crear estructura completa del perfil
            const profile = this.createProfileStructure(validatedData);
            
            // Guardar perfil
            this.profiles.set(profile.id, profile);
            
            // Registrar evento
            this.recordInteraction(profile.id, 'profile_created', {
                timestamp: new Date(),
                data: { name: profile.name, tier: profile.financial.tier }
            });
            
            // Notificar cambios
            this.notifyListeners('profile:created', { profile });
            
            // Auto-guardar si está habilitado
            if (this.config.autoSave) {
                await this.saveProfile(profile.id);
            }
            
            return profile;
            
        } catch (error) {
            console.error('Error creando perfil:', error);
            throw error;
        }
    }

    /**
     * Actualiza un perfil existente
     */
    async updateProfile(profileId, updates) {
        try {
            const profile = this.profiles.get(profileId);
            if (!profile) {
                throw new Error(`Perfil ${profileId} no encontrado`);
            }
            
            // Crear backup del estado anterior
            const previousState = this.deepClone(profile);
            
            // Aplicar actualizaciones
            const updatedProfile = this.mergeProfileUpdates(profile, updates);
            
            // Validar perfil actualizado
            this.validateProfile(updatedProfile);
            
            // Actualizar timestamp
            updatedProfile.lastModified = new Date();
            updatedProfile.version = (profile.version || 1) + 1;
            
            // Guardar cambios
            this.profiles.set(profileId, updatedProfile);
            
            // Registrar en historial
            if (this.config.enableHistory) {
                this.addToHistory(profileId, {
                    action: 'profile_updated',
                    timestamp: new Date(),
                    changes: this.calculateChanges(previousState, updatedProfile),
                    previousState: previousState
                });
            }
            
            // Registrar interacción
            this.recordInteraction(profileId, 'profile_updated', {
                timestamp: new Date(),
                changes: Object.keys(updates)
            });
            
            // Notificar cambios
            this.notifyListeners('profile:updated', { 
                profile: updatedProfile, 
                changes: updates,
                previousState 
            });
            
            return updatedProfile;
            
        } catch (error) {
            console.error('Error actualizando perfil:', error);
            throw error;
        }
    }

    /**
     * Obtiene un perfil por ID
     */
    getProfile(profileId) {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            console.warn(`Perfil ${profileId} no encontrado`);
            return null;
        }
        
        // Registrar acceso
        this.recordInteraction(profileId, 'profile_accessed', {
            timestamp: new Date()
        });
        
        this.currentProfile = profile;
        return this.deepClone(profile);
    }

    /**
     * Obtiene múltiples perfiles con filtros
     */
    getProfiles(filters = {}) {
        let profiles = Array.from(this.profiles.values());
        
        // Aplicar filtros
        if (filters.tier) {
            profiles = profiles.filter(p => p.financial.tier === filters.tier);
        }
        
        if (filters.status) {
            profiles = profiles.filter(p => p.status === filters.status);
        }
        
        if (filters.company) {
            profiles = profiles.filter(p => 
                p.company.name.toLowerCase().includes(filters.company.toLowerCase())
            );
        }
        
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            profiles = profiles.filter(p => 
                p.name.toLowerCase().includes(searchTerm) ||
                p.company.name.toLowerCase().includes(searchTerm) ||
                p.email.toLowerCase().includes(searchTerm)
            );
        }
        
        // Ordenar resultados
        if (filters.sortBy) {
            profiles = this.sortProfiles(profiles, filters.sortBy, filters.sortOrder);
        }
        
        return profiles.map(p => this.deepClone(p));
    }

    /**
     * Elimina un perfil
     */
    async deleteProfile(profileId) {
        try {
            const profile = this.profiles.get(profileId);
            if (!profile) {
                throw new Error(`Perfil ${profileId} no encontrado`);
            }
            
            // Marcar como eliminado en lugar de eliminar completamente
            profile.status = 'deleted';
            profile.deletedAt = new Date();
            
            // Registrar eliminación
            this.recordInteraction(profileId, 'profile_deleted', {
                timestamp: new Date()
            });
            
            // Notificar cambios
            this.notifyListeners('profile:deleted', { profileId, profile });
            
            // Auto-guardar cambios
            if (this.config.autoSave) {
                await this.saveProfile(profileId);
            }
            
            return true;
            
        } catch (error) {
            console.error('Error eliminando perfil:', error);
            throw error;
        }
    }

    /**
     * Agrega una nota a un perfil
     */
    addNote(profileId, noteData) {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            throw new Error(`Perfil ${profileId} no encontrado`);
        }
        
        const note = {
            id: this.generateUniqueId(),
            content: noteData.content,
            author: noteData.author,
            timestamp: new Date(),
            type: noteData.type || 'general',
            priority: noteData.priority || 'normal',
            tags: noteData.tags || []
        };
        
        if (!profile.notes) {
            profile.notes = [];
        }
        
        profile.notes.unshift(note);
        profile.lastModified = new Date();
        
        // Registrar interacción
        this.recordInteraction(profileId, 'note_added', {
            timestamp: new Date(),
            noteId: note.id,
            type: note.type
        });
        
        // Notificar cambios
        this.notifyListeners('profile:note_added', { profileId, note });
        
        return note;
    }

    /**
     * Agrega un documento a un perfil
     */
    addDocument(profileId, documentData) {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            throw new Error(`Perfil ${profileId} no encontrado`);
        }
        
        const document = {
            id: this.generateUniqueId(),
            name: documentData.name,
            type: documentData.type,
            url: documentData.url,
            size: documentData.size,
            uploadedBy: documentData.uploadedBy,
            uploadedAt: new Date(),
            description: documentData.description || '',
            tags: documentData.tags || []
        };
        
        if (!profile.documents) {
            profile.documents = [];
        }
        
        profile.documents.unshift(document);
        profile.lastModified = new Date();
        
        // Registrar interacción
        this.recordInteraction(profileId, 'document_added', {
            timestamp: new Date(),
            documentId: document.id,
            documentType: document.type
        });
        
        // Notificar cambios
        this.notifyListeners('profile:document_added', { profileId, document });
        
        return document;
    }

    /**
     * Actualiza el engagement de un patrocinador
     */
    updateEngagement(profileId, engagementData) {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            throw new Error(`Perfil ${profileId} no encontrado`);
        }
        
        const previousEngagement = profile.engagement.score;
        
        // Actualizar métricas de engagement
        profile.engagement = {
            ...profile.engagement,
            ...engagementData,
            lastUpdated: new Date(),
            history: profile.engagement.history || []
        };
        
        // Agregar al historial de engagement
        profile.engagement.history.push({
            score: engagementData.score || previousEngagement,
            timestamp: new Date(),
            source: engagementData.source || 'manual',
            details: engagementData.details || {}
        });
        
        // Mantener solo los últimos 50 registros
        if (profile.engagement.history.length > 50) {
            profile.engagement.history = profile.engagement.history.slice(-50);
        }
        
        profile.lastModified = new Date();
        
        // Registrar interacción
        this.recordInteraction(profileId, 'engagement_updated', {
            timestamp: new Date(),
            previousScore: previousEngagement,
            newScore: engagementData.score,
            source: engagementData.source
        });
        
        // Notificar cambios
        this.notifyListeners('profile:engagement_updated', { 
            profileId, 
            engagement: profile.engagement,
            previousScore: previousEngagement
        });
        
        return profile.engagement;
    }

    /**
     * Obtiene el historial de un perfil
     */
    getProfileHistory(profileId) {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            return [];
        }
        
        return profile.history || [];
    }

    /**
     * Obtiene las interacciones de un perfil
     */
    getProfileInteractions(profileId) {
        return this.interactions.get(profileId) || [];
    }

    /**
     * Busca perfiles por texto
     */
    searchProfiles(query) {
        const searchTerm = query.toLowerCase();
        const results = [];
        
        for (const profile of this.profiles.values()) {
            const relevance = this.calculateSearchRelevance(profile, searchTerm);
            if (relevance > 0) {
                results.push({
                    profile: this.deepClone(profile),
                    relevance
                });
            }
        }
        
        // Ordenar por relevancia
        results.sort((a, b) => b.relevance - a.relevance);
        
        return results.map(r => r.profile);
    }

    /**
     * Exporta perfiles en diferentes formatos
     */
    exportProfiles(profileIds = [], format = 'json') {
        const profilesToExport = profileIds.length > 0 
            ? profileIds.map(id => this.profiles.get(id)).filter(Boolean)
            : Array.from(this.profiles.values());
        
        switch (format) {
            case 'json':
                return JSON.stringify(profilesToExport, null, 2);
                
            case 'csv':
                return this.convertProfilesToCSV(profilesToExport);
                
            case 'xml':
                return this.convertProfilesToXML(profilesToExport);
                
            default:
                throw new Error(`Formato de exportación no soportado: ${format}`);
        }
    }

    /**
     * Importa perfiles desde datos externos
     */
    async importProfiles(data, format = 'json') {
        try {
            let profiles;
            
            switch (format) {
                case 'json':
                    profiles = typeof data === 'string' ? JSON.parse(data) : data;
                    break;
                    
                case 'csv':
                    profiles = this.parseCSVToProfiles(data);
                    break;
                    
                default:
                    throw new Error(`Formato de importación no soportado: ${format}`);
            }
            
            const results = {
                imported: 0,
                updated: 0,
                errors: []
            };
            
            for (const profileData of profiles) {
                try {
                    const existingProfile = this.profiles.get(profileData.id);
                    
                    if (existingProfile) {
                        await this.updateProfile(profileData.id, profileData);
                        results.updated++;
                    } else {
                        await this.createProfile(profileData);
                        results.imported++;
                    }
                } catch (error) {
                    results.errors.push({
                        profile: profileData.name || profileData.id,
                        error: error.message
                    });
                }
            }
            
            return results;
            
        } catch (error) {
            console.error('Error importando perfiles:', error);
            throw error;
        }
    }

    /**
     * Valida los datos de un perfil
     */
    validateProfileData(data) {
        const errors = [];
        
        // Validaciones básicas
        for (const [field, rules] of Object.entries(this.profileSchema)) {
            if (rules.required && !data[field]) {
                errors.push(`Campo requerido: ${field}`);
            }
            
            if (data[field] && rules.type === 'email') {
                if (!this.isValidEmail(data[field])) {
                    errors.push(`Email inválido: ${data[field]}`);
                }
            }
        }
        
        if (errors.length > 0) {
            throw new Error(`Errores de validación: ${errors.join(', ')}`);
        }
        
        return data;
    }

    /**
     * Crea la estructura completa de un perfil
     */
    createProfileStructure(data) {
        return {
            id: data.id,
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            status: data.status || 'active',
            
            company: {
                name: data.company?.name || '',
                industry: data.company?.industry || '',
                size: data.company?.size || '',
                website: data.company?.website || '',
                description: data.company?.description || '',
                logo: data.company?.logo || null
            },
            
            contact: {
                primaryContact: data.contact?.primaryContact || data.name,
                title: data.contact?.title || '',
                department: data.contact?.department || '',
                preferredMethod: data.contact?.preferredMethod || 'email',
                timezone: data.contact?.timezone || 'UTC',
                language: data.contact?.language || 'en'
            },
            
            financial: {
                tier: data.financial?.tier || 'supporter',
                totalContributed: data.financial?.totalContributed || 0,
                currentAmount: data.financial?.currentAmount || 0,
                currency: data.financial?.currency || 'USD',
                paymentMethod: data.financial?.paymentMethod || '',
                billingFrequency: data.financial?.billingFrequency || 'annual',
                nextPaymentDate: data.financial?.nextPaymentDate || null,
                contractStart: data.financial?.contractStart || new Date(),
                contractEnd: data.financial?.contractEnd || null
            },
            
            engagement: {
                score: data.engagement?.score || 0,
                level: this.calculateEngagementLevel(data.engagement?.score || 0),
                lastContact: data.engagement?.lastContact || null,
                interactions: data.engagement?.interactions || 0,
                eventAttendance: data.engagement?.eventAttendance || 0,
                responseRate: data.engagement?.responseRate || 0,
                satisfaction: data.engagement?.satisfaction || 0,
                history: data.engagement?.history || []
            },
            
            preferences: {
                communications: data.preferences?.communications || {
                    email: true,
                    phone: false,
                    sms: false,
                    newsletter: true
                },
                reportingFrequency: data.preferences?.reportingFrequency || 'monthly',
                eventNotifications: data.preferences?.eventNotifications || true,
                marketingOptIn: data.preferences?.marketingOptIn || false,
                dataSharing: data.preferences?.dataSharing || false
            },
            
            tags: data.tags || [],
            notes: data.notes || [],
            documents: data.documents || [],
            history: data.history || [],
            
            metadata: {
                source: data.metadata?.source || 'manual',
                createdBy: data.metadata?.createdBy || 'system',
                assignedTo: data.metadata?.assignedTo || null,
                priority: data.metadata?.priority || 'normal',
                region: data.metadata?.region || '',
                segment: data.metadata?.segment || ''
            },
            
            // Timestamps
            createdAt: data.createdAt || new Date(),
            lastModified: new Date(),
            lastContact: data.lastContact || null,
            version: 1
        };
    }

    /**
     * Fusiona actualizaciones en un perfil existente
     */
    mergeProfileUpdates(profile, updates) {
        const updated = this.deepClone(profile);
        
        // Fusión profunda de objetos anidados
        for (const [key, value] of Object.entries(updates)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                updated[key] = { ...updated[key], ...value };
            } else {
                updated[key] = value;
            }
        }
        
        return updated;
    }

    /**
     * Calcula el nivel de engagement basado en el score
     */
    calculateEngagementLevel(score) {
        if (score >= 8) return 'high';
        if (score >= 6) return 'medium';
        if (score >= 4) return 'low';
        return 'very_low';
    }

    /**
     * Calcula la relevancia de búsqueda
     */
    calculateSearchRelevance(profile, searchTerm) {
        let relevance = 0;
        
        // Coincidencia exacta en nombre (máxima relevancia)
        if (profile.name.toLowerCase() === searchTerm) {
            relevance += 100;
        } else if (profile.name.toLowerCase().includes(searchTerm)) {
            relevance += 50;
        }
        
        // Coincidencia en empresa
        if (profile.company.name.toLowerCase().includes(searchTerm)) {
            relevance += 30;
        }
        
        // Coincidencia en email
        if (profile.email.toLowerCase().includes(searchTerm)) {
            relevance += 20;
        }
        
        // Coincidencia en tags
        const tagMatches = profile.tags.filter(tag => 
            tag.toLowerCase().includes(searchTerm)
        ).length;
        relevance += tagMatches * 10;
        
        // Coincidencia en notas
        const noteMatches = profile.notes.filter(note => 
            note.content.toLowerCase().includes(searchTerm)
        ).length;
        relevance += noteMatches * 5;
        
        return relevance;
    }

    /**
     * Ordena perfiles según criterio
     */
    sortProfiles(profiles, sortBy, order = 'asc') {
        return profiles.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                    
                case 'company':
                    aValue = a.company.name.toLowerCase();
                    bValue = b.company.name.toLowerCase();
                    break;
                    
                case 'amount':
                    aValue = a.financial.totalContributed;
                    bValue = b.financial.totalContributed;
                    break;
                    
                case 'engagement':
                    aValue = a.engagement.score;
                    bValue = b.engagement.score;
                    break;
                    
                case 'tier':
                    const tierOrder = { platinum: 4, gold: 3, silver: 2, bronze: 1, supporter: 0 };
                    aValue = tierOrder[a.financial.tier] || 0;
                    bValue = tierOrder[b.financial.tier] || 0;
                    break;
                    
                case 'date':
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
                    break;
                    
                default:
                    aValue = a[sortBy];
                    bValue = b[sortBy];
            }
            
            if (order === 'desc') {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            } else {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            }
        });
    }

    /**
     * Convierte perfiles a formato CSV
     */
    convertProfilesToCSV(profiles) {
        const headers = [
            'ID', 'Name', 'Email', 'Company', 'Tier', 'Amount', 
            'Engagement', 'Status', 'Created', 'Last Modified'
        ];
        
        const rows = profiles.map(profile => [
            profile.id,
            profile.name,
            profile.email,
            profile.company.name,
            profile.financial.tier,
            profile.financial.totalContributed,
            profile.engagement.score,
            profile.status,
            profile.createdAt.toISOString(),
            profile.lastModified.toISOString()
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    /**
     * Configura el auto-guardado
     */
    setupAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.autoSaveInterval = setInterval(() => {
            this.saveAllProfiles();
        }, this.config.autoSaveInterval || 60000); // 1 minuto por defecto
    }

    /**
     * Configura el tracking de interacciones
     */
    setupInteractionTracking() {
        // Configurar listeners para eventos del DOM que indiquen interacciones
        document.addEventListener('click', (e) => {
            const sponsorCard = e.target.closest('[data-sponsor-id]');
            if (sponsorCard) {
                const sponsorId = sponsorCard.dataset.sponsorId;
                this.recordInteraction(sponsorId, 'card_clicked', {
                    timestamp: new Date(),
                    element: e.target.tagName.toLowerCase()
                });
            }
        });
    }

    /**
     * Registra una interacción con un perfil
     */
    recordInteraction(profileId, type, data = {}) {
        if (!this.interactions.has(profileId)) {
            this.interactions.set(profileId, []);
        }
        
        const interaction = {
            id: this.generateUniqueId(),
            type,
            timestamp: new Date(),
            ...data
        };
        
        const interactions = this.interactions.get(profileId);
        interactions.unshift(interaction);
        
        // Mantener solo las últimas 100 interacciones
        if (interactions.length > 100) {
            interactions.splice(100);
        }
    }

    /**
     * Agrega entrada al historial de un perfil
     */
    addToHistory(profileId, entry) {
        const profile = this.profiles.get(profileId);
        if (!profile) return;
        
        if (!profile.history) {
            profile.history = [];
        }
        
        profile.history.unshift({
            id: this.generateUniqueId(),
            ...entry
        });
        
        // Mantener solo las últimas 50 entradas de historial
        if (profile.history.length > 50) {
            profile.history.splice(50);
        }
    }

    /**
     * Calcula cambios entre dos estados de perfil
     */
    calculateChanges(oldState, newState) {
        const changes = {};
        
        for (const key in newState) {
            if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
                changes[key] = {
                    from: oldState[key],
                    to: newState[key]
                };
            }
        }
        
        return changes;
    }

    /**
     * Carga perfiles desde almacenamiento
     */
    async loadProfiles() {
        // En un entorno real, esto cargaría desde una API o base de datos
        // Por ahora, usar datos mock
        const mockProfiles = [
            {
                id: '1',
                name: 'María González',
                email: 'maria.gonzalez@techcorp.com',
                company: { name: 'TechCorp Inc.' },
                financial: { tier: 'platinum', totalContributed: 75000 },
                engagement: { score: 8.5 }
            },
            {
                id: '2', 
                name: 'Carlos Ruiz',
                email: 'carlos.ruiz@greenenergy.com',
                company: { name: 'Green Energy Solutions' },
                financial: { tier: 'gold', totalContributed: 35000 },
                engagement: { score: 7.8 }
            }
        ];
        
        for (const profileData of mockProfiles) {
            const profile = this.createProfileStructure(profileData);
            this.profiles.set(profile.id, profile);
        }
    }

    /**
     * Guarda un perfil específico
     */
    async saveProfile(profileId) {
        const profile = this.profiles.get(profileId);
        if (!profile) return false;
        
        // En un entorno real, esto haría una llamada a la API
        console.log('💾 Guardando perfil:', profile.name);
        return true;
    }

    /**
     * Guarda todos los perfiles
     */
    async saveAllProfiles() {
        const profiles = Array.from(this.profiles.values());
        console.log(`💾 Auto-guardando ${profiles.length} perfiles...`);
        
        // En un entorno real, esto haría llamadas a la API
        return true;
    }

    /**
     * Utilidades
     */
    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    validateProfile(profile) {
        // Validaciones adicionales del perfil completo
        if (!profile.id || !profile.name || !profile.email) {
            throw new Error('Perfil inválido: faltan campos requeridos');
        }
        return true;
    }

    /**
     * Event listeners
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error en listener de perfil:', error);
            }
        });
    }

    /**
     * Destructor
     */
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.profiles.clear();
        this.cache.clear();
        this.interactions.clear();
        this.listeners.clear();
        
        console.log('🧹 Sponsor Profiles destruido correctamente');
    }
}

// Exportar para uso global
window.SponsorProfiles = SponsorProfiles;