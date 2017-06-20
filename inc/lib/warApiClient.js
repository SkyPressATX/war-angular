// warApiClient Module
// Stand Alone and implementable
// Don't need depend on the WAR Frameworks war-parent theme
// Still has a dependancy on lodash  :/
angular.module( 'warApiClient', [] )


// This provider allows for configuration of the warClient before the run phase.
// For now this is used to set the WP REST API prefix, and nonce for authentication
	.provider( '$warClientConfig', function(){
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
	})

	// The $warCall is made into it's own service so that technically you can inject it elsewhere
	// This is useful if you don't want to build the entire $warClient
	// but still want proper and secure HTTP calls to the WP REST API
	.service( '$warCall', [
		'$http',
		function( $http ){
			var that = this;
			this.apiCall = function( method, url, params, match ){
				var httpConfig = {
					method: method,
					url: '/' + that._config.api_prefix + url
				};
				if( that._config.nonce ) httpConfig.headers = { 'X-WP-Nonce': that._config.nonce };
				if( match ) httpConfig.url += match;
				if( params && _.isObject( params ) && method === 'GET' ) httpConfig.params = params;
				if( params && _.isObject( params ) && method !== 'GET' ) httpConfig.data = params;

				return $http( httpConfig ).then(function(r){
					return r.data;
				}).catch(function(err){
					return { error: err.statusText, data: err.data };
				});
			};
			this._config = {
				'api_prefix': 'wp-json',
				'nonce': false
			};
			this._configure = function( obj ){
				that._config = _.merge( that._config, obj );
			}
		}
	])

	// Here is the meat and bones of this Client
	// The $warClient is responsible for discovering the available WP REST API Routes
	// Then binding each available HTTP Method to the proper $warCall function
	// Example usage would be $warClient.name( 'wp/v2' ).pages.get( { slug: 'home' } )
	// Returns a promise
	// NOTE: Implementation is dependant on when the $warClient.discover() method is called
	// the WAR Framework is using ui-router's new $transistions hook "onBefore"
	// See line 48 of /inc/angular/source/WarFactories.js
	.service( '$warClient', [
		'$warCall',
	    function( $warCall ){
			this.stashRoutes;
			this.siteDetails = {};
			this.namespaces;
			this.routes = {};

			this.discover = function(){
	            var that = this;

	            if( ! _.isEmpty( that.routes ) ) return true; // Don't rediscover if we don't need to
				if( ! _.isEmpty( that.namespaces ) ) return true;

				return $warCall.apiCall( 'GET', '/' )
		            .then( function( resp ){
						if( resp.routes ) that.stashRoutes = resp.routes;
						if( resp.namespaces ) that.namespaces = resp.namespaces;
						if( resp.name ) that.siteDetails.name = resp.name;
						if( resp.description ) that.siteDetails.description = resp.description;
						return true;
						throw new Error( 'No Routes Found' );
					})
					.catch( function( err ){
						console.log( err );
						return { 'error': err };
					});
			};
			this.bindRoutes = function( ns ){
				var that = this;
				if( ! ns ) ns = '';
				_.assign( that.routes, _.transform( that.stashRoutes, function( r, v, k ){
					if( v.namespace == ns && v.namespace !== _.trimStart( k, '/' ) ){ // We don't want duplicate routes of the namespace
						var end = _.replace( k, /\(\?P.+\)/, '' );
						var endName = _.camelCase( _.replace( _.trimStart( end, '/' ), v.namespace + '/', '' ) );
						if( ! r[ v.namespace ] ) r[ v.namespace ] = {};
						if( _.isEmpty( r[ v.namespace ][ endName ] ) ) r[ v.namespace ][ endName ] = {};
			            _.each( v.methods, function( m ){
							if( _.isEmpty( r[ v.namespace ][ endName ][ m ] ) ) r[ v.namespace ][ endName ][ _.toLower( m ) ] = _.bind( $warCall[ 'apiCall' ], r[ v.namespace ][ endName ], m, end );
			            } );
					}
				}, {}) );
				return that.routes;
			};
			this.name = function( ns ){
				if( ! _.isString( ns ) ) throw new Error( 'Namespace needs to be a string' );
	            if( ! _.indexOf( this.namespaces, ns ) > 0 ) throw new Error( ns + ' Namespace not found' );
				if( _.isEmpty( this.routes[ ns ] ) ) this.bindRoutes( ns );
	            return this.routes[ ns ];
			};
			this.list = function( ns ){
	            if( ! _.indexOf( this.namespaces, ns ) > 0 ) throw new Error( ns + ' Namespace not found' );
	            if( ! _.isString( ns ) || ! ns ) return this.routes;
			    return this.routes[ ns ];
			};
			this.site = function(){
				return this.siteDetails;
			};
		}
	])

	// Lastly, we are going to tap into the angular 'run' phase
	// This ensures that any configuration settings that have been passed into the $warClientConfig provider
	// during the 'config' phase will actually be implemented
	.run( [ '$warClientConfig', function( $warClientConfig ){
		$warClientConfig.init();
	}]);
