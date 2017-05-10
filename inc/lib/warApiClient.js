// warApiClient Module
// Stand Alone and implementable
// Don't need depend on the WAR Frameworks war-parent theme
// Still has a dependancy on lodash  :/
var warApiClient = angular.module( 'warApiClient', [] );


// This provider allows for configuration of the warClient before the run phase.
// For now this is used to set the WP REST API prefix, and nonce for authentication
warApiClient.provider( '$warClientConfig', function(){
	var configObject = {};

	this.configure = function( obj ){
		configObject = obj;
	};

	this.$get = [ '$warCall', function( $warCall ){
		return {
			'init': function(){
				$warCall._configure( configObject );
			}
		};
	}];
});

// The $warCall is made into it's own service so that technically you can inject it elsewhere
// This is useful if you don't want to build the entire $warClient
// but still want proper and secure HTTP calls to the WP REST API
warApiClient.service( '$warCall', [
	'$http',
	function( $http ){
		var that = this;
		var apiCall = function(method, url, params ){
			var httpConfig = {
				method: method,
				url: '/' + that._config.api_prefix + url
			};
			if( that._config.nonce ) httpConfig.headers = { 'X-WP-Nonce': that._config.nonce };
			if( params && method === 'GET' ) httpConfig.params = params;
			if( params && method !== 'GET' ) httpConfig.data = params;

			return $http( httpConfig ).then(function(r){
				return r.data;
			}).catch(function(err){
				return { error: err.statusText, data: err.data };
			});
		};

		this.get = function( url, params ){
			return apiCall( 'GET', url, params );
		};
        this.put = function( url, params ){
            return apiCall( 'PUT', url, params );
        };
		this.post = function( url, params ){
			return apiCall( 'POST', url, params );
		};
        this.patch = function( url, params ){
            return apiCall( 'PATCH', url, params );
        };
		this.delete = function( url, params ){
			return apiCall( 'DELETE', url, params );
		};

		this._config = {
			'api_prefix': 'wp-json',
			'nonce': false
		};
		this._configure = function( obj ){
			that._config = _.merge( that._config, obj );
		}
	}
]);

// Here is the meat and bones of this Client
// The $warClient is responsible for discovering the available WP REST API Routes
// Then binding each available HTTP Method to the proper $warCall function
// Example usage would be $warClient.name( 'wp/v2' ).pages.get( { slug: 'home' } )
// Returns a promise
// NOTE: Implementation is dependant on when the $warClient.discover() method is called
// the WAR Framework is using ui-router's new $transistions hook "onBefore"
// See line 48 of /inc/angular/source/WarFactories.js
warApiClient.service( '$warClient', [
	'$warCall',
    function( $warCall ){
		this.routes = {};
		this.discover = function( ns ){
            var that = this;
			if( ! ns ) ns = '';

            if( ! _.isEmpty( that.routes ) ) return true;

			return $warCall.get( '/' + ns )
	            .then( function( resp ){
					if( resp.routes ) return resp.routes;
					throw new Error( 'No Routes Found' );
				})
				.then( function( routes ){
					_.assign( that.routes, _.transform( routes, function( r, v, k ){
						if( v.namespace && v.namespace !== _.trimStart( k, '/' ) ){ // We don't want duplicate routes of the namespace
							if( ! r[ v.namespace ] ) r[ v.namespace ] = {};
	                        var end = {};
	                        _.each( v.methods, function( m ){
	                            m = _.toLower( m );
	                            end[ m ] = _.bind( $warCall[ m ], end, k );
	                        } );

							r[ v.namespace ][ _.camelCase( _.replace( _.trimStart( k, '/' ), v.namespace + '/', '' ) ) ] = end;
						}
					}, {}) );
					return that.routes;
				})
				.catch( function( err ){
					console.log( err );
					return { 'error': err };
				});
		};
		this.name = function( ns ){
			if( ! _.isString( ns ) ) throw new Error( 'Namespace needs to be a string' );
            if( ! this.routes[ ns ] ) throw new Error( ns + ' Namespace not found' );
            return this.routes[ ns ];
		};
		this.list = function( ns ){
            if( _.isEmpty( this.routes ) ) throw new Error( 'Namespace not found' );
            if( ! _.isString( ns ) || ! ns ) return this.routes;
		    return this.routes[ ns ];
		};
	}
]);

// Lastly, we are going to tap into the angular 'run' phase
// This ensures that any configuration settings that have been passed into the $warClientConfig provider
// during the 'config' phase will actually be implemented
warApiClient.run( [ '$warClientConfig', function( $warClientConfig ){
	$warClientConfig.init();
}])
