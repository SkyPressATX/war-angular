var extend = angular.module("$warExtend",[
    'ui.router',
    'warApiClient'
])
	// Constants
    .constant('warRoutesConstant', {})
	.constant('warComponentsConstant', {})
	.constant('$warObject', warObject )
	// Providers
	.provider('$warRoutes', ['warRoutesConstant',function(warRoutesConstant){
	    this.edit = function( name, route ){
	        _.set( warRoutesConstant, name, route );
	    };
	    this.add = function( name, route ){
	        warRoutesConstant[name] = route;
	    };
	    this.remove = function( name ){
	        if( warRoutesConstant[ name ] ) delete warRoutesConstant[ name ];
	    };
	    this.$get = function(){
	        return warRoutesConstant;
	    };
	}])
    .provider('$warComponents', ['warComponentsConstant', function(warComponentsConstant){
        this.edit = function( name, comp ){
            _.set( warComponentsConstant, name, comp );
        };
        this.add = function( name, comp ){
            warComponentsConstant[ name ] = comp;
        };
        this.remove = function( name ){
            if( warComponentsConstant[ name ] ) delete warComponentsConstant[ name ];
        };
        this.$get = function(){
            return warComponentsConstant;
        }
    }])
    // Component Provider Config
    .config([ '$warComponentsProvider', '$warObject', function( $warComponentsProvider, $warObject ){
        $warComponentsProvider.add( 'warRoot', {
            templateUrl: $warObject.warPath + '/inc/templates/root.html',
            bindings: {
                warOptions: '='
            }
        });
        $warComponentsProvider.add( 'warHome', {
            template: '<h3>Hello</h3>'
        });
        $warComponentsProvider.add( 'warHeader', {
            templateUrl: $warObject.warPath + '/inc/templates/header.html',
            require: {
                warRoot: '^warRoot'
            }
        });
        $warComponentsProvider.add( 'warFooter', {
            templateUrl: $warObject.warPath + '/inc/templates/footer.html',
            require: {
                warRoot: '^warRoot'
            }
        });
    }])
	// Routes Provider Config
	.config([ '$warRoutesProvider', function( $warRoutesProvider ){
		$warRoutesProvider.add( 'root', {
			abstract: true,
			component: 'warRoot',
			resolve: {
				warOptions: [ '$warClient', '$warObject', function( $warClient, $warObject ){
					return $warClient.name( $warObject.api_namespace ).siteOptions.get()
						.then( function( opts ){ return opts })
						.catch( function( err ){ console.log( err ); return err; });
				}]
			}
		});
		$warRoutesProvider.add( 'home', {
			parent: 'root',
			url: '/',
			views: {
				"header": { component: 'warHeader' },
				"body": { component: 'warHome' },
				"footer": { component: 'warFooter' }
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
                // if( v.parent == 'root' ) _.set( v, 'require.warRoot', '^warRoot' );
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
