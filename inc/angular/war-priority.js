angular.module("$warExtend",[
    'ui.router',
    'warApiClient'
])
	// Constants
    .constant('warRoutesConstant', {})
	.constant('warComponentsConstant', {})
	.constant('$warObject', angular.fromJson( angular.toJson( warObject ) ) )
	// Providers
    .provider( '$warConfig', [
        'warRoutesConstant',
        'warComponentsConstant',
        function( warRoutesConstant, warComponentsConstant ){
            var edit = function( x, name, y ){
                _.set( x, name, y );
            };
            var add = function( x, name, y ){
                x[ name ] = y;
            };
            var remove = function( x, name ){
                if( x[ name ] ) delete x[ name ];
            };
            this.routes = {
                edit: function( name, opts ){
                    edit( warRoutesConstant, name, opts );
                    return this;
                },
                add: function( name, opts ){
                    add( warRoutesConstant, name, opts );
                    return this;
                },
                remove: function( name ){
                    remove( warRoutesConstant, name )
                    return this;
                }
            };
            this.components = {
                edit: function( name, opts ){
                    edit( warComponentsConstant, name, opts );
                    return this;
                },
                add: function( name, opts ){
                    add( warComponentsConstant, name, opts );
                    return this;
                },
                remove: function( name ){
                    remove( warComponentsConstant, name );
                    return this;
                }
            };
            this.$get = function(){
                return this;
            }
        }
    ])
    .config([ '$warConfigProvider', '$warObject', function( $warConfigProvider, $warObject ){
        // Component Config
        $warConfigProvider.components
            .add( 'warRoot', {
                templateUrl: $warObject.warPath + '/inc/templates/root.html',
                bindings: {
                    warOptions: '<'
                }
            })
            .add( 'warHome', {
                template: '<h3>Hello</h3>'
            })
            .add( 'warHeader', {
                templateUrl: $warObject.warPath + '/inc/templates/header.html',
            })
            .add( 'warFooter', {
                templateUrl: $warObject.warPath + '/inc/templates/footer.html',
            });
        // Routes Config
        $warConfigProvider.routes
            .add( 'root', {
                abstract: true,
                component: 'warRoot',
                resolve: {
                    warOptions: [ '$warClient', '$warObject', function( $warClient, $warObject ){
                        return $warClient.name( $warObject.api_namespace ).siteOptions.get()
                            .then( function( opts ){ return opts })
                            .catch( function( err ){ console.log( err ); return err; });
                    }]
                }
            })
            .add( 'home', {
                parent: 'root',
                url: '/',
                views: {
                    // "header": { component: 'warHeader' },
                    "body": { component: 'warHome' },
                    // "footer": { component: 'warFooter' }
                }
            });
    }])
    // url Router Configuration
	.config([
	    '$urlRouterProvider',
	    '$locationProvider',
	    '$urlMatcherFactoryProvider',
	    function( $urlRouterProvider, $locationProvider, $urlMatcherFactoryProvider ){
	        $urlMatcherFactoryProvider.strictMode(false);
	        $locationProvider.html5Mode(true);
	        $urlRouterProvider.otherwise('/'); // Default Location
	    }
	])
	.config([ '$warClientConfigProvider', '$warObject', function( $warClientConfigProvider, $warObject ){
	    $warClientConfigProvider.configure({
	        'api_prefix': $warObject.api_prefix,
	        'nonce': $warObject.nonce
	    });
	}])
	// Run Blocks
	.run( [ '$transitions', function( $transitions ){
	    $transitions.onBefore( { }, function( trans ){
	        var warClient = trans.injector().get( '$warClient' );
	        return warClient.discover();
	    } );
	}])
    // Filters
	.filter('safeHTML', ['$sce', function($sce) {
	    return function(input) {
	        if( String(input).match(/\<.*\>/) ) return $sce.trustAsHtml(input);
	        return input;
	    };
	}])
	.filter('firstCap', ['$filter', function($filter){
	    return function(input, scope) {
	        if (input!=null)
	        input = input.toLowerCase();
	        var inputArray = input.split(' ');
	        var newArray = _.map(inputArray, function(n){
	            return n.substring(0,1).toUpperCase()+n.substring(1);
	        });
	        return newArray.join(' ');
	    }
	}])
	.filter('toSpace', ['$filter', function($filter){
	    return function(input){
	        if(input == null){ return ""; }
	        var newVal = input.replace(/_/g,' ');
	        return newVal;
	    };
	}])
	.filter('capSpace', ['$filter', function($filter){
	    return function(input){
	        if(input == null){ return ""; }
	        var newVal = input.replace(/([A-Z])/g,' $1');
	        return newVal;
	    };
	}])
	.filter('mysqlDate', ['$filter',function( $filter ){
	  return function(text){
	    var  tempdate= new Date(text.replace(/-/g,"/"));
	    return $filter('date')(tempdate, "yyyy-MM-dd");
	  }
  }]);

angular.module( '$warModule', [ '$warExtend' ] )
    // Component Mapping
    .config([
        'warComponentsConstant',
        '$compileProvider',
        function( warComponentsConstant, $compileProvider ){
            _.forEach( warComponentsConstant, function(v,k){
                if( v.parent == 'root' ) _.set( v, 'require.warRoot', '^warRoot' );
                $compileProvider.component( k, v );
            });
        }
    ])
    // state Provider Configuration (map routes)
    .config([
        '$stateProvider',
        'warRoutesConstant',
        function( $stateProvider, warRoutesConstant ){
            _.forEach(warRoutesConstant, function(v,k){
                $stateProvider.state(k,v);
            });
        }
    ]);
