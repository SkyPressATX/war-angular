<?php

if( ! class_exists( 'war_theme' ) ):

    class war_theme {

        public $war_styles;
        public $war_priority_scripts;
        public $war_child_scripts;
        public $war_secondary_scripts;

        public function filter_init(){
            /** Filter Arrays **/
            $this->war_filter_styles();
            $this->war_filter_priority_scripts();
            $this->war_filter_child_scripts();
            $this->war_filter_secondary_scripts();
        }
        public function enqueue_init(){
            /** Register Results **/
            $this->war_register_styles();
            $this->war_register_scripts();
        }

        private function war_default_styles(){
            $war_parent_style = [
                'url' => get_template_directory_uri() . '/style.css',
                'depends' => [ 'war_bootstrap_core_css' ]
            ];

            return [
                'war_bootstrap_core_css' => [
                    'url' => '//maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.6/css/bootstrap.min.css'
                ],
                'war_ionicons' => [
                    'url' => '//code.ionicframework.com/ionicons/2.0.1/css/ionicons.min.css'
                ],
                'war_parent_style' => ( is_child_theme() ) ? $war_parent_style : false,
                'war_style' => [
                    'url' => get_stylesheet_uri(),
                    'depends' => [ 'war_bootstrap_core_css' ]
                ]
            ];
        }

        private function war_default_priority_scripts(){
            return array(
                'war_tether_js' => array(
                    'url' => '//cdnjs.cloudflare.com/ajax/libs/tether/1.4.0/js/tether.min.js',
                    'depends' => array('jquery')
                ),
                'war_lodash_js' => array(
                    'url' => '//cdn.jsdelivr.net/lodash/4.17.4/lodash.min.js',
                    'depends' => array('jquery')
                ),
                'war_bootstrap_core_js' => array(
                    'url' => '//maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.6/js/bootstrap.min.js',
                    'depends' => array('jquery','war_tether_js')
                ),
                'war_angular_js' => array(
                    'url' => '//ajax.googleapis.com/ajax/libs/angularjs/1.6.4/angular.min.js',
                    'depends' => array('jquery')
                ),
                'war_ui_router_js' => array(
                    'url' => '//unpkg.com/angular-ui-router/release/angular-ui-router.min.js',
                    'depends' => array('war_angular_js')
                ),
                'war_api_client_js' => array(
                    'url' => get_template_directory_uri().'/inc/lib/warApiClient.js',
                    'depends' => array('war_angular_js')
                ),
                'war_extend_module_js' => [
                    'url' => get_template_directory_uri() . '/inc/angular/war-priority.min.js',
                    'depends' => [ 'war_angular_js' ]
                ]
            );
        }

        private function war_filter_styles(){
            $this->war_styles = apply_filters( 'war_styles', $this->war_default_styles() );
        }

        private function war_filter_priority_scripts(){
            $this->war_priority_scripts = apply_filters( 'war_priority_scripts', $this->war_default_priority_scripts() );
        }

        private function war_filter_child_scripts(){
            $this->war_child_scripts = apply_filters( 'war_child_scripts', [] );
        }

        private function war_filter_secondary_scripts(){
            $this->war_secondary_scripts = apply_filters( 'war_secondary_scripts', [] );
        }

        private function war_register_styles(){
            array_walk( $this->war_styles, function( $v, $k ){
                if( ! $v || empty( $v ) ) return;
                $this->war_registrar( $k, $v, true );
            });
        }

        private function war_register_scripts(){
            $script_array = [
                $this->war_priority_scripts,
                $this->war_child_scripts,
                $this->war_secondary_scripts
            ];

            array_walk( $script_array, function( $scripts ){
                array_walk( $scripts, function( $v, $k ){
                    if( ! $v || empty( $v ) ) return;
                    $this->war_registrar( $k, $v );
                });
            });

        }

        private function war_registrar( $name = false, $item = [], $is_style = false ){
            if( ! $name ) return;
            $depends = ( isset( $item[ "depends" ] ) && is_array( $item[ "depends" ] ) ) ? $item[ "depends" ] : false;
            if( $is_style ){
                wp_register_style( $name, $item[ 'url' ], $depends );
                wp_enqueue_style( $name );
            }else{
                if( ! $depends ) $depends = [ 'war_extend_module_js' ];
                wp_register_script( $name, $item[ "url" ], $depends, null, true );
                wp_enqueue_script( $name, $name );

            }
        }

        public function war_register_main_menu() {
            register_nav_menu('header',__('Header Menu'));
        }

        public function war_remove_cssjs_ver( $src ) {
            if( strpos( $src, '?ver=' ) )
                $src = remove_query_arg( 'ver', $src );
            return $src;
        }
        public function war_admin_login_redirect_remove(){
            $uri = untrailingslashit($_SERVER['REQUEST_URI']);
            $login_url = site_url('login','relative');
            $admin_url = site_url('admin','relative');
            if($uri === $login_url || $uri === $admin_url){
                remove_action( 'template_redirect', 'wp_redirect_admin_locations', 1000 );
            }
        }
        public function war_force_resolve(){
            $uri = $_SERVER['REQUEST_URI'];
            if(preg_match('/^\/admin\/.*/',$uri)){
                status_header(200);
            }
        }
    } // END war_theme Class


endif; // END class_exists Check

$war_theme = new war_theme;
$war_theme->filter_init();
add_action( 'wp_enqueue_scripts', [ $war_theme, 'enqueue_init' ] );
add_action( 'init', [ $war_theme, 'war_register_main_menu']);
add_filter( 'style_loader_src', [ $war_theme, 'war_remove_cssjs_ver' ], 10, 2 );
add_filter( 'script_loader_src', [ $war_theme, 'war_remove_cssjs_ver' ], 10, 2 );
add_action( 'template_redirect',[ $war_theme, 'war_admin_login_redirect_remove' ] );
add_action( 'wp', [ $war_theme, 'war_force_resolve' ] );

/**********************************************************************
* Actions and Filters to remove
**********************************************************************/
remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
remove_action( 'wp_print_styles', 'print_emoji_styles' );
remove_filter('template_redirect', 'redirect_canonical');
